import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-grow flex items-center justify-center p-margin-mobile py-16">
      <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-xl shadow-level-1 border border-outline-variant/30 text-center space-y-4">
        <span className="material-symbols-outlined text-6xl text-primary">broken_image</span>
        <h1 className="font-h1 text-4xl font-extrabold text-on-surface">404</h1>
        <h2 className="font-h3 text-xl font-bold text-on-surface">Page Not Found</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
