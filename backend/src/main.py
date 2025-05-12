# /home/ubuntu/sava_portal/backend/src/main.py

import sys
import os
import jwt
import datetime
import stripe # Import stripe
import logging # Import logging
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from pyairtable import Api

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# Initialize Flask app
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "static"))
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_EXPIRATION_MINUTES"] = int(os.getenv("JWT_EXPIRATION_MINUTES", 60))

# Initialize extensions
bcrypt = Bcrypt(app)
# Configure CORS to allow requests from the deployed frontend
frontend_url = "https://sava-portal-frontend.onrender.com"
CORS(app, origins=[frontend_url], supports_credentials=True)

# Initialize Airtable API client
airtable_api_key = os.getenv("AIRTABLE_API_KEY")
airtable_base_id = os.getenv("AIRTABLE_BASE_ID")
airtable_users_table_name = os.getenv("AIRTABLE_USERS_TABLE_NAME", "Users")

if not all([airtable_api_key, airtable_base_id]):
    logging.error("Airtable API Key or Base ID not configured in .env file.")
    airtable_api = None
    users_table = None
else:
    try:
        airtable_api = Api(airtable_api_key)
        users_table = airtable_api.table(airtable_base_id, airtable_users_table_name)
        logging.info(f"Successfully connected to Airtable base {airtable_base_id}, table {airtable_users_table_name}")
    except Exception as e:
        logging.error(f"Error connecting to Airtable: {e}")
        airtable_api = None
        users_table = None

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe_publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY")

if not stripe.api_key or not stripe_publishable_key:
    logging.error("Stripe API keys not configured in .env file.")

# --- Helper for protected routes --- #
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")
        logging.info(f"Authorization Header: {auth_header}")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            logging.info("Token extracted from header.")
        else:
            logging.warning("Authorization header missing or malformed.")
            return jsonify({"message": "Authorization header missing or malformed"}), 401

        try:
            logging.info("Attempting to decode token...")
            data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            current_user_data = data
            user_id = current_user_data.get("user_id")
            logging.info(f"Token decoded successfully for user_id: {user_id}")

            if not user_id:
                logging.error("User ID not found in token payload.")
                return jsonify({"message": "Invalid token payload"}), 401

            if users_table:
                logging.info(f"Fetching Airtable record for user_id: {user_id}")
                user_record = users_table.get(user_id)
                if not user_record:
                    logging.warning(f"User not found in Airtable for user_id: {user_id}")
                    return jsonify({"message": "User not found"}), 401
                logging.info(f"Airtable record found for user_id: {user_id}")
                current_user_data["airtable_record"] = user_record
            else:
                 logging.error("Airtable connection not configured or failed during token validation.")
                 return jsonify({"error": "Airtable connection not configured or failed"}), 500

        except jwt.ExpiredSignatureError:
            logging.warning("Token has expired!")
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError as e:
            logging.warning(f"Token is invalid: {e}")
            return jsonify({"message": "Token is invalid!"}), 401
        except Exception as e:
            logging.error(f"Error during token validation or Airtable fetch: {e}", exc_info=True)
            return jsonify({"message": "Error processing token"}), 500

        logging.info("Token validation successful, proceeding to route.")
        return f(current_user_data, *args, **kwargs)
    return decorated

# --- Authentication Endpoints --- #

@app.route("/auth/register", methods=["POST"])
def register_user():
    if not users_table:
        logging.error("Register attempt failed: Airtable connection not configured.")
        return jsonify({"error": "Airtable connection not configured or failed"}), 500

    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "")

    if not email or not password:
        logging.warning(f"Registration failed for email {email}: Missing email or password.")
        return jsonify({"error": "Email and password are required"}), 400

    try:
        # Escape double quotes in email for Airtable formula
        escaped_email = email.replace("\"", "\\\"") # Escape \" for formula
        formula = f'{{Email}} = "{escaped_email}"'
        logging.info(f"Checking for existing user with formula: {formula}")
        existing_users = users_table.all(formula=formula)
        if existing_users:
            logging.warning(f"Registration failed for email {email}: Email already registered.")
            return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
        logging.error(f"Error checking existing user {email} in Airtable: {e}", exc_info=True)
        return jsonify({"error": "Failed to check user existence"}), 500

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    try:
        new_user_record = {
            "Email": email,
            "PasswordHash": hashed_password,
            "Name": name,
            "SignupDate": datetime.datetime.utcnow().isoformat() + "Z",
            "PaymentStatus": "unpaid"
        }
        logging.info(f"Creating user record for email: {email}")
        created_record = users_table.create(new_user_record)
        user_id = created_record["id"]
        logging.info(f"User registered successfully: {email}, Airtable ID: {user_id}")
        return jsonify({"message": "User registered successfully", "userId": user_id}), 201
    except Exception as e:
        logging.error(f"Error creating user {email} in Airtable: {e}", exc_info=True)
        return jsonify({"error": "Failed to register user"}), 500

@app.route("/auth/login", methods=["POST"])
def login_user():
    if not users_table:
        logging.error("Login attempt failed: Airtable connection not configured.")
        return jsonify({"error": "Airtable connection not configured or failed"}), 500

    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        logging.warning(f"Login failed for email {email}: Missing email or password.")
        return jsonify({"error": "Email and password are required"}), 400

    try:
        # Escape double quotes in email for Airtable formula
        escaped_email = email.replace("\"", "\\\"") # Escape \" for formula
        formula = f'{{Email}} = "{escaped_email}"'
        logging.info(f"Attempting login for email {email} with formula: {formula}")
        user_records = users_table.all(formula=formula)
        if not user_records:
            logging.warning(f"Login failed for email {email}: Invalid email.")
            return jsonify({"error": "Invalid email or password"}), 401

        user_record = user_records[0]
        stored_hash = user_record.get("fields", {}).get("PasswordHash")

        if not stored_hash or not bcrypt.check_password_hash(stored_hash, password):
            logging.warning(f"Login failed for email {email}: Invalid password.")
            return jsonify({"error": "Invalid email or password"}), 401

        user_id = user_record["id"]
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=app.config["JWT_EXPIRATION_MINUTES"])
        }
        token = jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")

        logging.info(f"User logged in successfully: {email}, Airtable ID: {user_id}")
        payment_status = user_record.get("fields", {}).get("PaymentStatus", "unknown")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "userId": user_id,
            "name": user_record.get("fields", {}).get("Name", ""),
            "paymentStatus": payment_status
        }), 200

    except Exception as e:
        logging.error(f"Error during login for {email}: {e}", exc_info=True)
        return jsonify({"error": "Login failed"}), 500

# --- Stripe Payment Endpoints --- #

@app.route("/api/generate-payment-secret", methods=["POST"])
@token_required
def create_payment(current_user_data):
    user_id = current_user_data.get("user_id")
    email = current_user_data.get("email")
    logging.info(f"Creating payment intent for user_id: {user_id}, email: {email}")

    if not stripe.api_key:
        logging.error(f"Stripe not configured for user_id: {user_id}")
        return jsonify({"error": "Stripe not configured"}), 500

    try:
        logging.info("Calling stripe.PaymentIntent.create...")
        intent = stripe.PaymentIntent.create(
            amount=10000,
            currency="usd",
            automatic_payment_methods={"enabled": True},
            metadata={
                "airtable_user_id": user_id,
                "email": email
            }
        )
        logging.info(f"PaymentIntent created successfully for user_id: {user_id}, Intent ID: {intent.id}")
        client_secret_value = intent.client_secret
        response_data = {"clientSecret": client_secret_value}
        logging.info(f"Attempting to return JSON for user_id {user_id} via /api/generate-payment-secret: {response_data}")
        return jsonify(response_data)
    except stripe.error.StripeError as e:
        logging.error(f"Stripe API error creating PaymentIntent for user_id {user_id}: {e}", exc_info=True)
        status_code = getattr(e, 'http_status', 500)
        return jsonify(error=f"Stripe error: {e.user_message or str(e)}"), status_code
    except Exception as e:
        logging.error(f"Generic error creating PaymentIntent for user_id {user_id}: {e}", exc_info=True)
        return jsonify(error="An unexpected error occurred while creating the payment intent."), 500

@app.route("/api/payment-status")
@token_required
def get_payment_status(current_user_data):
    user_id = current_user_data.get("user_id")
    logging.info(f"Fetching payment status for user_id: {user_id}")
    if not users_table:
        logging.error(f"Cannot fetch payment status for user_id {user_id}: Airtable connection not configured.")
        return jsonify({"error": "Airtable connection not configured or failed"}), 500

    try:
        user_record = current_user_data.get("airtable_record")
        if not user_record:
             logging.warning(f"Airtable record not found in token data for user_id {user_id}, fetching again.")
             user_record = users_table.get(user_id)
             if not user_record:
                  logging.warning(f"User not found in Airtable when fetching payment status for user_id: {user_id}")
                  return jsonify({"error": "User not found"}), 404

        payment_status = user_record.get("fields", {}).get("PaymentStatus", "unknown")
        logging.info(f"Payment status for user_id {user_id}: {payment_status}")
        return jsonify({"paymentStatus": payment_status}), 200
    except Exception as e:
        logging.error(f"Error fetching payment status for user_id {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch payment status"}), 500

# Moved this endpoint definition earlier to avoid potential shadowing by static route
@app.route("/api/update-payment-status", methods=["POST"])
@token_required
def update_payment_status(current_user_data):
    user_id = current_user_data.get("user_id")
    logging.info(f"Attempting to update payment status to 'paid' for user_id: {user_id}")

    if not users_table:
        logging.error(f"Cannot update payment status for user_id {user_id}: Airtable connection not configured.")
        return jsonify({"error": "Airtable connection not configured or failed"}), 500

    try:
        # Fetch the record again to ensure we have the latest version (optional but safer)
        user_record = users_table.get(user_id)
        if not user_record:
            logging.warning(f"User not found in Airtable when trying to update payment status for user_id: {user_id}")
            return jsonify({"error": "User not found"}), 404

        # Update the PaymentStatus field
        fields_to_update = {"PaymentStatus": "paid"}
        logging.info(f"Updating Airtable record {user_id} with fields: {fields_to_update}")
        updated_record = users_table.update(user_id, fields_to_update)

        if updated_record and updated_record.get("fields", {}).get("PaymentStatus") == "paid":
            logging.info(f"Payment status successfully updated to 'paid' for user_id: {user_id}")
            return jsonify({"message": "Payment status updated successfully", "paymentStatus": "paid"}), 200
        else:
            logging.error(f"Airtable update failed or did not return expected status for user_id: {user_id}. Record: {updated_record}")
            return jsonify({"error": "Failed to update payment status in Airtable"}), 500

    except Exception as e:
        logging.error(f"Error updating payment status for user_id {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to update payment status"}), 500

# TODO: Add a webhook endpoint (/stripe-webhook)

# --- Example Protected Route --- #
@app.route("/api/user-profile")
@token_required
def get_user_profile(current_user_data):
    user_id = current_user_data.get("user_id")
    logging.info(f"Accessing user profile for user_id: {user_id}")
    user_record = current_user_data.get("airtable_record")
    payment_status = user_record.get("fields", {}).get("PaymentStatus", "unknown")

    if payment_status != "paid":
        logging.warning(f"Profile access denied for user_id {user_id}: Payment status is {payment_status}")
        return jsonify({"error": "Payment required to access this resource", "paymentStatus": payment_status}), 402

    logging.info(f"Profile access granted for user_id {user_id}")
    return jsonify({
        "message": "This is a protected route",
        "user": {
            "id": user_id,
            "email": current_user_data["email"],
            "name": user_record.get("fields", {}).get("Name", ""),
            "paymentStatus": payment_status
        }
    })

# --- Static file serving --- #
# This route should come AFTER specific API routes
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if not path.startswith("api/") and not path.startswith("auth/"):
        return jsonify({"message": "API server is running. Access frontend via its development server or static host."}), 200
    else:
        # Let Flask handle 404 for non-matched API/auth routes
        return jsonify({"error": "API endpoint not found"}), 404 # Explicitly return 404
        
        pass

if __name__ == "__main__":
    logging.info("Starting Flask server...")
        # Use PORT environment variable provided by Render, default to 5003 for local dev
    port = int(os.environ.get("PORT", 5003))
    # Debug should be False in production
    app.run(host="0.0.0.0", port=port, debug=False)



# --- Simple Test Route --- #
@app.route("/api/test", methods=["GET"])
def test_route():
    logging.info("Accessed /api/test route")
    return jsonify({"message": "It worked!"}), 200

# --- Static file serving --- #
