import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlotPicker } from '@/components/booking/SlotPicker';
import { TimeSlot } from '@/api/types';

describe('SlotPicker Component', () => {
  const mockSlots: TimeSlot[] = [
    {
      slotId: 'slot_1',
      startTime: '09:00',
      endTime: '11:00',
      label: '9:00 AM - 11:00 AM',
      available: true,
    },
    {
      slotId: 'slot_2',
      startTime: '11:00',
      endTime: '13:00',
      label: '11:00 AM - 1:00 PM',
      available: true,
    },
    {
      slotId: 'slot_3',
      startTime: '14:00',
      endTime: '16:00',
      label: '2:00 PM - 4:00 PM',
      available: true,
    },
  ];

  it('renders available slot cards correctly', () => {
    render(
      <SlotPicker
        slots={mockSlots}
        isLoading={false}
        selectedSlotId=""
        onSelectSlot={vi.fn()}
        selectedDate="2026-08-20"
        onDateChange={vi.fn()}
      />
    );

    expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument();
    expect(screen.getByText('11:00 AM - 1:00 PM')).toBeInTheDocument();
    expect(screen.getByText('2:00 PM - 4:00 PM')).toBeInTheDocument();
  });

  it('triggers onSelectSlot when an available slot is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <SlotPicker
        slots={mockSlots}
        isLoading={false}
        selectedSlotId=""
        onSelectSlot={handleSelect}
        selectedDate="2026-08-20"
        onDateChange={vi.fn()}
      />
    );

    const slot1Radio = screen.getByDisplayValue('slot_1');
    await user.click(slot1Radio);

    expect(handleSelect).toHaveBeenCalledWith(mockSlots[0]);
  });

  it('renders 409 conflict alternatives banner if alternatives provided', async () => {
    const user = userEvent.setup();
    const handleSelectAlt = vi.fn();

    const alternatives = [
      {
        slotId: 'alt_slot_1',
        startTime: '16:00',
        endTime: '18:00',
        label: '4:00 PM - 6:00 PM',
      },
    ];

    render(
      <SlotPicker
        slots={mockSlots}
        isLoading={false}
        selectedSlotId=""
        onSelectSlot={vi.fn()}
        selectedDate="2026-08-20"
        onDateChange={vi.fn()}
        conflictAlternatives={alternatives}
        onSelectAlternative={handleSelectAlt}
      />
    );

    expect(screen.getByText(/slot just taken/i)).toBeInTheDocument();
    const altButton = screen.getByRole('button', { name: /4:00 PM - 6:00 PM/i });
    expect(altButton).toBeInTheDocument();

    await user.click(altButton);
    expect(handleSelectAlt).toHaveBeenCalledWith(alternatives[0]);
  });
});
