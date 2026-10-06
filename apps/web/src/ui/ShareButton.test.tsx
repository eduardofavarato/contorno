import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareButton } from './ShareButton';

const MORE = 'Mais opções de compartilhamento';

describe('ShareButton', () => {
  it('shows its label and shares the image when clicked', () => {
    const onShareImage = vi.fn();
    render(<ShareButton label="Compartilhar ranking" onShareImage={onShareImage} onShareText={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Compartilhar ranking/ }));

    expect(onShareImage).toHaveBeenCalledOnce();
  });

  it('offers sharing as text in a menu, and closes it afterwards', () => {
    const onShareText = vi.fn();
    render(<ShareButton label="Compartilhar" onShareImage={vi.fn()} onShareText={onShareText} />);
    expect(screen.queryByText(/Compartilhar como texto/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(MORE));
    fireEvent.click(screen.getByText(/Compartilhar como texto/));

    expect(onShareText).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Compartilhar como texto/)).not.toBeInTheDocument();
  });

  it('closes the menu when the player clicks elsewhere', () => {
    render(
      <div>
        <ShareButton label="Compartilhar" onShareImage={vi.fn()} onShareText={vi.fn()} />
        <p>fora</p>
      </div>,
    );
    fireEvent.click(screen.getByLabelText(MORE));
    expect(screen.getByText(/Compartilhar como texto/)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('fora'));

    expect(screen.queryByText(/Compartilhar como texto/)).not.toBeInTheDocument();
  });
});
