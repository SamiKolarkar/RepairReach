import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface BookingLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookingLookupModal: React.FC<BookingLookupModalProps> = ({ isOpen, onClose }) => {
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = reference.trim();
    if (!cleanRef) {
      setError('Please enter a booking reference ID');
      return;
    }
    setError('');
    onClose();
    navigate(`/booking/${encodeURIComponent(cleanRef)}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Track Your Repair Booking" maxWidth="md">
      <form onSubmit={handleLookup} className="space-y-4 pt-2">
        <p className="text-sm text-on-surface-variant">
          Enter your unguessable Booking Reference ID (e.g.{' '}
          <span className="font-mono font-semibold text-primary">RR-20260820-8942</span>) to view live
          repair status, assigned technician, or cancel pre-arrival.
        </p>

        <Input
          label="Booking Reference ID"
          placeholder="RR-20260820-8942"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            if (error) setError('');
          }}
          error={error}
          leftIcon="search"
          autoFocus
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" leftIcon={<span className="material-symbols-outlined text-[20px]">manage_search</span>}>
            Find Booking
          </Button>
        </div>
      </form>
    </Modal>
  );
};
