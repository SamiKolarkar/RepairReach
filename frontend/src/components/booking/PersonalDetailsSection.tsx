import React from 'react';
import { Input } from '@/components/ui/Input';

export interface PersonalDetailsSectionProps {
  fullName: string;
  onFullNameChange: (val: string) => void;
  fullNameError?: string;
  phoneNumber: string;
  onPhoneNumberChange: (val: string) => void;
  phoneNumberError?: string;
}

export const PersonalDetailsSection: React.FC<PersonalDetailsSectionProps> = ({
  fullName,
  onFullNameChange,
  fullNameError,
  phoneNumber,
  onPhoneNumberChange,
  phoneNumberError,
}) => {
  return (
    <section className="bg-surface-container-lowest rounded-xl p-md shadow-level-1 border border-outline-variant/30 text-left">
      <h2 className="font-h3 text-h3 text-on-surface mb-md">Personal Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <Input
          id="name"
          name="name"
          label="Full Name"
          placeholder="e.g. Sarah Jenkins"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          error={fullNameError}
          leftIcon="person"
          required
        />
        <Input
          id="phone"
          name="phone"
          label="Phone Number"
          placeholder="e.g. 98765 43210"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          error={phoneNumberError}
          leftIcon="call"
          type="tel"
          helperText="We will send real-time SMS/WhatsApp updates to this number"
          required
        />
      </div>
    </section>
  );
};
