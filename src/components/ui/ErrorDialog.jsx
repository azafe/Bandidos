// src/components/ui/ErrorDialog.jsx
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { setErrorDialogListener, buildSupportWhatsAppUrl } from "../../utils/errorDialog";

export default function ErrorDialog() {
  const [error, setError] = useState(null);

  useEffect(() => {
    setErrorDialogListener(setError);
    return () => setErrorDialogListener(null);
  }, []);

  const close = () => setError(null);

  return (
    <Modal isOpen={Boolean(error)} onClose={close} title="Ocurrió un error" className="error-dialog">
      {error && (
        <>
          <div className="error-dialog__icon">⚠️</div>
          <p className="error-dialog__message">{error.message}</p>
          <p className="error-dialog__hint">
            Podés cerrar este cartel e intentar de nuevo, o avisarle a soporte para que lo revise.
          </p>
          <div className="error-dialog__actions">
            <button type="button" className="btn-secondary" onClick={close}>
              Cerrar
            </button>
            <a
              className="btn-primary error-dialog__support"
              href={buildSupportWhatsAppUrl(error)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
            >
              Contactar soporte
            </a>
          </div>
        </>
      )}
    </Modal>
  );
}
