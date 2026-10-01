import React, { createContext, useContext, useState, useCallback } from 'react';

type DialogType = 'alert' | 'confirm' | 'success' | 'error' | 'warning';

interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogState extends DialogOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface DialogContextType {
  showAlert: (message: string, options?: Omit<DialogOptions, 'message'>) => Promise<void>;
  showConfirm: (message: string, options?: Omit<DialogOptions, 'message'>) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
  showWarning: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType>({
  showAlert: async () => {},
  showConfirm: async () => false,
  showSuccess: async () => {},
  showError: async () => {},
  showWarning: async () => {},
});

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    message: '',
    resolve: null,
  });

  const openDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, isOpen: true, resolve });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setDialog((prev) => {
      prev.resolve?.(result);
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  const showAlert = useCallback(async (message: string, options?: Omit<DialogOptions, 'message'>) => {
    await openDialog({ message, type: 'alert', ...options });
  }, [openDialog]);

  const showConfirm = useCallback((message: string, options?: Omit<DialogOptions, 'message'>): Promise<boolean> => {
    return openDialog({ message, type: 'confirm', ...options });
  }, [openDialog]);

  const showSuccess = useCallback(async (message: string, title?: string) => {
    await openDialog({ message, type: 'success', title: title ?? 'Sucesso' });
  }, [openDialog]);

  const showError = useCallback(async (message: string, title?: string) => {
    await openDialog({ message, type: 'error', title: title ?? 'Erro' });
  }, [openDialog]);

  const showWarning = useCallback(async (message: string, title?: string) => {
    await openDialog({ message, type: 'warning', title: title ?? 'Atenção' });
  }, [openDialog]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showSuccess, showError, showWarning }}>
      {children}
      {dialog.isOpen && <DialogModal dialog={dialog} onClose={handleClose} />}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);

/* ─── Modal Component ─────────────────────────────────────────────────── */

interface DialogModalProps {
  dialog: DialogState;
  onClose: (result: boolean) => void;
}

function DialogModal({ dialog, onClose }: DialogModalProps) {
  const isConfirm = dialog.type === 'confirm';
  const isSuccess = dialog.type === 'success';
  const isError   = dialog.type === 'error';
  const isWarning = dialog.type === 'warning';

  /* ── Icon ── */
  const Icon = () => {
    if (isSuccess) return (
      <div className="dialog-icon dialog-icon--success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    );
    if (isError) return (
      <div className="dialog-icon dialog-icon--error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
    );
    if (isWarning || isConfirm) return (
      <div className={`dialog-icon ${isWarning ? 'dialog-icon--warning' : 'dialog-icon--confirm'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
    );
    /* default: info */
    return (
      <div className="dialog-icon dialog-icon--info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
    );
  };

  const defaultTitle = isSuccess ? 'Sucesso' : isError ? 'Erro' : isWarning ? 'Atenção' : isConfirm ? 'Confirmação' : 'Informação';
  const title = dialog.title ?? defaultTitle;

  return (
    <div className="dialog-overlay" onClick={() => !isConfirm && onClose(true)}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header stripe */}
        <div className={`dialog-header dialog-header--${isSuccess ? 'success' : isError ? 'error' : isWarning ? 'warning' : isConfirm ? 'confirm' : 'info'}`}>
          <Icon />
          <h2 className="dialog-title">{title}</h2>
        </div>

        {/* Body */}
        <div className="dialog-body">
          <p className="dialog-message">{dialog.message}</p>
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          {isConfirm && (
            <button className="dialog-btn dialog-btn--cancel" onClick={() => onClose(false)}>
              {dialog.cancelLabel ?? 'Cancelar'}
            </button>
          )}
          <button
            className={`dialog-btn dialog-btn--confirm dialog-btn--${isSuccess ? 'success' : isError ? 'error' : isWarning ? 'warning' : isConfirm ? 'confirm' : 'info'}`}
            onClick={() => onClose(true)}
            autoFocus
          >
            {dialog.confirmLabel ?? (isConfirm ? 'Confirmar' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}
