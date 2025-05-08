import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// A wrapper for <Route> that redirects to the login page if not authenticated
const PrivateRoute = ({ component: Component, ...rest }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Show loading indicator while checking authentication
    return <div className="loading">Loading...</div>;
  }

  return (
    <Route
      {...rest}
      render={(props) => {
        return user ? (
          <Component {...props} />
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: props.location }
            }}
          />
        )
      }}
    />
  );
};

export default PrivateRoute; 