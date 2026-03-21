'use client';

import { useEffect } from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirm action',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isConfirming = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirming) onCancel();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel, isConfirming]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => !isConfirming && onCancel()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalText}>{message}</p>
        <div className={styles.modalActions}>
          <button 
            className={styles.btnCancel} 
            onClick={onCancel}
            disabled={isConfirming}
            style={{ opacity: isConfirming ? 0.5 : 1, cursor: isConfirming ? 'not-allowed' : 'pointer'}}
          >
            {cancelText}
          </button>
          <button 
            className={styles.btnDelete} 
            onClick={onConfirm}
            disabled={isConfirming}
            style={{ opacity: isConfirming ? 0.5 : 1, cursor: isConfirming ? 'not-allowed' : 'pointer'}}
          >
            {isConfirming ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
