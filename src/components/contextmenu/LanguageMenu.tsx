import { Portal } from "../Portal";
import { ReactNode, useState } from "react";
import { ContextMenuTrigger } from "@firefox-devtools/react-contextmenu";
import { Menu } from "./menu";
import { BiLogoPython, BiLogoTypescript, BiCode } from "react-icons/bi";

const PROGRAMMING_LANGUAGES = [
  ["", "Auto-detect"],
  ["TYPESCRIPT", "TypeScript"],
  ["PYTHON", "Python"],
];

interface Props {
  id: string;
  button: ReactNode;
  filterKeyword?: boolean;
  className?: string;
  onSelect?: (language: string) => void;
}

export const getLanguageIcon = (language: string | null) => {
  switch (language) {
    case "TYPESCRIPT":
      return BiLogoTypescript;
    case "PYTHON":
      return BiLogoPython;
    default:
      return BiCode;
  }
};

function LanguageMenu({
  id,
  button,
  filterKeyword = false,
  className,
  onSelect,
}: Props) {
  const [keyword, setKeyword] = useState(``);

  const handleSelect = (language: string) => {
    setKeyword(``);
    if (onSelect) onSelect(language);
  };

  let languages = PROGRAMMING_LANGUAGES;
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    languages = languages.filter(
      ([_value, label]) =>
        label.toLowerCase().indexOf(normalizedKeyword) !== -1,
    );
  }

  const options = languages.map(([value, label]) => {
    const IconComponent = getLanguageIcon(value);
    return (
      <Menu.Item key={`language-${value}`} onClick={() => handleSelect(value)}>
        <IconComponent className="mr-3" /> <span>{label}</span>
      </Menu.Item>
    );
  });

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
          searchPlaceholder="Set language..."
          onKeywordChange={(kw) => setKeyword(kw)}
          className={className}
        >
          {options}
        </Menu>
      </Portal>
    </>
  );
}

export default LanguageMenu;
