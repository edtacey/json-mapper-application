import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbstractedFlag } from '../AbstractedFlag';

describe('AbstractedFlag Component', () => {
  it('renders with default props', () => {
    const handleChange = jest.fn();
    render(
      <AbstractedFlag checked={false} onChange={handleChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('Abstracted');
    
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(label).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    const handleChange = jest.fn();
    render(
      <AbstractedFlag 
        checked={true} 
        onChange={handleChange} 
        label="Custom Abstracted Label"
      />
    );

    const label = screen.getByText('Custom Abstracted Label');
    expect(label).toBeInTheDocument();
  });

  it('handles checked state correctly', () => {
    const handleChange = jest.fn();
    render(
      <AbstractedFlag checked={true} onChange={handleChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const handleChange = jest.fn();
    render(
      <AbstractedFlag checked={false} onChange={handleChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('respects disabled state', () => {
    const handleChange = jest.fn();
    render(
      <AbstractedFlag 
        checked={false} 
        onChange={handleChange} 
        disabled={true}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    
    fireEvent.click(checkbox);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('displays tooltip on hover', async () => {
    const handleChange = jest.fn();
    render(
      <AbstractedFlag checked={false} onChange={handleChange} />
    );

    const helpIcon = screen.getByTestId('help-icon');
    fireEvent.mouseEnter(helpIcon);

    // Wait for tooltip to appear
    const tooltip = await screen.findByText(/Marks this entity as abstracted/);
    expect(tooltip).toBeInTheDocument();
  });
});
