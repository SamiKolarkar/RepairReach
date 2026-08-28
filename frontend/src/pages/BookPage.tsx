import React from 'react';
import { BookingForm } from '@/components/booking/BookingForm';

export const BookPage: React.FC = () => {
  return (
    <div className="w-full flex-grow flex items-center justify-center">
      <BookingForm />
    </div>
  );
};
