import type { ReactNode } from 'react';

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <div className="modal__head">
          <span className="modal__title">{title}</span>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        <div className="modal__foot">{footer}</div>
      </div>
    </div>
  );
}
