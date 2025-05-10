import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button'; // Assuming shadcn/ui button is available

const DashboardPage: React.FC = () => {
const { user, logout } = useAuth();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome! You are logged in.</p>
      {/* Add more dashboard content here later */}
      <Button onClick={logout} variant="destructive" className="mt-4">
        Logout
      </Button>
    </div>
  );
};

export default DashboardPage;

