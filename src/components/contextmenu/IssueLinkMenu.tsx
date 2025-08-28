import { Portal } from "../Portal";
import { ReactNode, useState } from "react";
import { ContextMenuTrigger } from "@firefox-devtools/react-contextmenu";
import { Menu } from "./menu";
import { MdOutlineSubdirectoryArrowRight } from "react-icons/md";
import { RiParentLine } from "react-icons/ri";
import { IoMdGitNetwork } from "react-icons/io";
import { AiOutlineStop } from "react-icons/ai";
import { BiDuplicate } from "react-icons/bi";
import {
  LinkType,
  LinkTypeValue,
  LinkTypeDisplay,
  InverseLinkTypeDisplay,
} from "../../types/types";
import IssueSelector from "../IssueSelector";

interface Props {
  id: string;
  button: ReactNode;
  filterKeyword?: boolean;
  className?: string;
  currentIssueId: string;
  onSelect?: (linkType: string, issueId: string) => void;
}

// Interface for menu options including display text and whether it's an inverse relationship
interface MenuOption {
  value: LinkTypeValue;
  displayText: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  isInverse?: boolean;
}

function IssueLinkMenu({
  id,
  button,
  filterKeyword = false,
  className,
  currentIssueId,
  onSelect,
}: Props) {
  const [_keyword, setKeyword] = useState("");
  const [selectedLinkType, setSelectedLinkType] =
    useState<LinkTypeValue | null>(null);
  const [showIssueSelector, setShowIssueSelector] = useState(false);
  const [isInverseRelationship, setIsInverseRelationship] = useState(false);

  const handleSelectLinkType = (
    linkType: LinkTypeValue,
    isInverse: boolean = false,
  ) => {
    setSelectedLinkType(linkType);
    setIsInverseRelationship(isInverse);
    setShowIssueSelector(true);
  };

  const handleSelectIssue = (issueId: string) => {
    if (selectedLinkType && onSelect) {
      // For inverse relationships, we swap the direction of the link
      // E.g., if user selects "Blocks" (inverse of "Blocked by"), we create a "Blocked by" link
      // from target to current issue instead of from current to target
      if (isInverseRelationship) {
        // Handle the special case at the point of creation
        // This is a bit of a hack, but it means we don't need to modify the data schema
        // Instead, we'll just swap the source and target when creating the relationship
        onSelect(`${selectedLinkType}:inverse`, issueId);
      } else {
        onSelect(selectedLinkType, issueId);
      }
    }
    setShowIssueSelector(false);
    setSelectedLinkType(null);
    setIsInverseRelationship(false);
  };

  const handleDismissSelector = () => {
    setShowIssueSelector(false);
    setSelectedLinkType(null);
    setIsInverseRelationship(false);
  };

  // Define menu options with both direct and inverse relationships
  const menuOptions: MenuOption[] = [
    // Regular relationships
    {
      value: LinkType.BLOCKED_BY,
      displayText: LinkTypeDisplay[LinkType.BLOCKED_BY],
      icon: AiOutlineStop,
    },
    {
      value: LinkType.BLOCKED_BY,
      displayText: InverseLinkTypeDisplay[LinkType.BLOCKED_BY],
      icon: AiOutlineStop,
      isInverse: true,
    },

    {
      value: LinkType.SUB_ISSUE,
      displayText: LinkTypeDisplay[LinkType.SUB_ISSUE],
      icon: MdOutlineSubdirectoryArrowRight,
    },
    {
      value: LinkType.SUB_ISSUE,
      displayText: InverseLinkTypeDisplay[LinkType.SUB_ISSUE],
      icon: RiParentLine,
      isInverse: true,
    },

    {
      value: LinkType.DUPLICATE,
      displayText: LinkTypeDisplay[LinkType.DUPLICATE],
      icon: BiDuplicate,
    },
    {
      value: LinkType.RELATED,
      displayText: LinkTypeDisplay[LinkType.RELATED],
      icon: IoMdGitNetwork,
    },
  ];

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="small"
          filterKeyword={filterKeyword}
          searchPlaceholder="Link to issue..."
          onKeywordChange={(kw) => setKeyword(kw)}
          className={className}
        >
          <Menu.Header>Mark as</Menu.Header>
          {menuOptions.map((option) => (
            <Menu.Item
              key={`link-type-${option.value}${option.isInverse ? "-inverse" : ""}`}
              onClick={() =>
                handleSelectLinkType(option.value, option.isInverse)
              }
            >
              <option.icon className="mr-3" /> <span>{option.displayText}</span>
            </Menu.Item>
          ))}
        </Menu>
      </Portal>

      {showIssueSelector && selectedLinkType && (
        <IssueSelector
          isOpen={showIssueSelector}
          linkType={selectedLinkType}
          currentIssueId={currentIssueId}
          onDismiss={handleDismissSelector}
          onSelect={handleSelectIssue}
          // For inverse relationships, we'll use the inverse display text
          displayOverride={
            isInverseRelationship
              ? InverseLinkTypeDisplay[selectedLinkType]
              : undefined
          }
        />
      )}
    </>
  );
}

export default IssueLinkMenu;
