import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="mb-2">Welcome, {user?.name || user?.email || 'User'}!</p>

      <div className="space-y-2 mb-4">
        <Link to="/intake" className="text-blue-600 hover:underline">
          Start Step 1: Seller Intake
        </Link>
        <Link to="/deal-analysis" className="text-blue-600 hover:underline block">
          Go to Deal Analysis
        </Link>
        {/* Add more steps here as routes are built */}
      </div>

      <Button onClick={logout} variant="destructive" className="mt-4">
        Logout
      </Button>
    </div>
  );
};

export default DashboardPage;

