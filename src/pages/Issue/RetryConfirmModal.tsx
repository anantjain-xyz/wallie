import React from 'react';
import Modal from '../../components/Modal';
import { Issue } from '../../types/types';

interface RetryConfirmModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
  issue: Issue;
  commentText: string;
}

function RetryConfirmModal({ isOpen, onDismiss, onConfirm, issue, commentText }: RetryConfirmModalProps) {
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      // Extract potential reason from the comment text
      const reasonMatch = commentText.match(/retry.*?because\s+(.*?)(?:\.|\n|$)/i);
      if (reasonMatch && reasonMatch[1]) {
        setReason(reasonMatch[1].trim());
      } else {
        setReason('');
      }
    }
  }, [isOpen, commentText]);

  const handleConfirm = () => {
    onConfirm(reason);
    onDismiss();
  };

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} size="medium">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Retry Issue</h3>
        
        <p className="mb-4 text-sm text-gray-600">
          It looks like you want to retry this issue based on your comment. 
          This will create a new issue with the same details and link it to this one.
        </p>
        
        <div className="mb-4">
          <label htmlFor="retry-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for retry (optional)
          </label>
          <textarea
            id="retry-reason"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you retrying this issue?"
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            onClick={onDismiss}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
            onClick={handleConfirm}
          >
            Retry Issue
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default RetryConfirmModal;