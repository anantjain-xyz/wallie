import { Portal } from "../Portal";
import { ReactNode, useState } from "react";
import { ContextMenuTrigger } from "@firefox-devtools/react-contextmenu";
import { Menu } from "./menu";
import { FaGithub } from "react-icons/fa";

interface Repository {
  id: string;
  full_name: string;
}

interface Props {
  id: string;
  button: ReactNode;
  repositories: Repository[];
  filterKeyword?: boolean;
  className?: string;
  onSelect?: (repoId: string | null) => void;
}

function GithubRepoMenu({
  id,
  button,
  repositories,
  filterKeyword = false,
  className,
  onSelect,
}: Props) {
  const [keyword, setKeyword] = useState(``);

  const handleSelect = (repoId: string | null) => {
    setKeyword(``);
    if (onSelect) onSelect(repoId);
  };

  let filteredRepos = repositories;
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    filteredRepos = repositories.filter(
      (repo) => repo.full_name.toLowerCase().indexOf(normalizedKeyword) !== -1,
    );
  }

  const options = [
    <Menu.Item key="no-repo" onClick={() => handleSelect(null)}>
      <FaGithub className="mr-3" /> <span>No repository</span>
    </Menu.Item>,
    ...filteredRepos.map((repo) => (
      <Menu.Item key={repo.id} onClick={() => handleSelect(repo.id)}>
        <FaGithub className="mr-3" /> <span>{repo.full_name}</span>
      </Menu.Item>
    )),
  ];

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="large"
          filterKeyword={filterKeyword}
          searchPlaceholder="Select repository..."
          onKeywordChange={(kw) => setKeyword(kw)}
          className={className}
        >
          {options}
        </Menu>
      </Portal>
    </>
  );
}

export default GithubRepoMenu;
