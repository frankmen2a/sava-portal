// /home/ubuntu/sava_portal/frontend/src/pages/Auth/LoginPage.tsx
import React, { useState, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthContext } from '@/context/AuthContext'; // Import context
import { useNavigate, Link } from 'react-router-dom'; // Import for redirection

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext)!; // Use context function
    const navigate = useNavigate(); // Use for redirection

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003'; // Use env variable

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${backendUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // Call context login function
            login(data.token, { id: data.userId, name: data.name, email: email, paymentStatus: data.paymentStatus });
            // console.log("Login successful:", data); // Placeholder
            // alert(`Login successful! Token: ${data.token}`); // Placeholder

            // Redirect to dashboard after successful login
            navigate("/dashboard"); // Navigate to dashboard

        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err.message || 'An unexpected error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Access your Sava Home Consultants account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="text-center text-sm">
                    Don't have an account? <Link to="/register" className="underline">Register here</Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default LoginPage;

