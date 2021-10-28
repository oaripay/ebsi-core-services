import React, {
  createContext,
  ReactElement,
  useCallback,
  useContext,
  useState,
} from "react";
import { Button, Modal } from "antd";

type ModalState = {
  show: boolean;
  content: ReactElement;
  options?: { footer: ReactElement[] };
};

type ModalContextType = {
  show: boolean;
  content: ReactElement;
  setModal: (data: ModalState) => void;
  showModal: (
    content: ReactElement,
    options?: { footer: ReactElement[] }
  ) => void;
  hideModal: () => void;
};

export const ModalContext = createContext<ModalContextType>({
  show: false,
  content: <></>,
  setModal: () => {},
  showModal: () => {},
  hideModal: () => {},
});

export function ModalProvider({
  children,
}: {
  children: ReactElement[] | ReactElement;
}) {
  const [modal, setModal] = useState<ModalState>({
    show: false,
    content: <></>,
  });

  const showModal = useCallback((content: ReactElement) => {
    setModal({
      show: true,
      content,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModal({
      show: false,
      content: <></>,
    });
  }, []);

  return (
    <>
      <Modal
        width={650}
        key="modal"
        visible={modal.show}
        onCancel={hideModal}
        closable={false}
        keyboard={false}
        footer={
          modal.options?.footer || [
            <Button
              key="show"
              onClick={() => {
                setModal({
                  show: false,
                  content: <></>,
                });
              }}
            >
              Close
            </Button>,
          ]
        }
      >
        {modal.content}
      </Modal>
      <ModalContext.Provider
        key="provider"
        value={{
          showModal,
          show: modal.show,
          content: modal.content,
          setModal,
          hideModal,
        }}
      >
        {children}
      </ModalContext.Provider>
    </>
  );
}

export function useModalContext(): ModalContextType {
  return useContext(ModalContext);
}
