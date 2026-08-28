import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BookingLookupModal } from './BookingLookupModal';

export const AppLayout: React.FC = () => {
  const [lookupOpen, setLookupOpen] = useState(false);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased pt-16 selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Navbar onOpenLookup={() => setLookupOpen(true)} />
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <BookingLookupModal isOpen={lookupOpen} onClose={() => setLookupOpen(false)} />
    </div>
  );
};
