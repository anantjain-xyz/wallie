import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import CommandBar from "./CommandBar";
import { CommandBarContext, IssueModalContext } from "../App";

const CommandBarWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { showCommandBar, setShowCommandBar } = useContext(CommandBarContext)!;
  const { setShowIssueModal } = useContext(IssueModalContext)!;

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <CommandBar
      isOpen={showCommandBar}
      onClose={() => setShowCommandBar(false)}
      onCreateIssue={() => setShowIssueModal(true)}
      onNavigate={handleNavigate}
    />
  );
};

export default CommandBarWrapper;
