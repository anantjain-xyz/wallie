import Modal from "./Modal";

interface Props {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onDismiss?: () => void;
  deleteIssues: () => void;
  selectedCount: number;
}

export default function BulkDeleteModal({
  isOpen,
  setIsOpen,
  onDismiss,
  deleteIssues,
  selectedCount,
}: Props) {
  const handleDelete = () => {
    setIsOpen(false);
    if (onDismiss) onDismiss();
    deleteIssues();
  };

  return (
    <Modal title="Delete Issues" isOpen={isOpen} onDismiss={onDismiss}>
      <div className="flex flex-col w-full px-8 py-5 overflow-y-auto">
        Are you sure you want to delete {selectedCount}{" "}
        {selectedCount === 1 ? "issue" : "issues"}?
      </div>
      <div className="flex w-full border-t border-gray-200 px-4 py-3">
        <button
          type="button"
          className="px-3 ml-auto text-white bg-gray-300 rounded hover:bg-gray-400 h-7"
          onClick={() => {
            setIsOpen(false);
            if (onDismiss) onDismiss();
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="px-3 ml-3 text-white bg-red-600 rounded hover:bg-red-700 h-7"
          onClick={handleDelete}
        >
          Delete Issues
        </button>
      </div>
    </Modal>
  );
}
