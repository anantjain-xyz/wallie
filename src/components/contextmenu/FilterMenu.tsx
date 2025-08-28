import { Portal } from "../Portal";
import { ReactNode, useState } from "react";
import { ContextMenuTrigger } from "@firefox-devtools/react-contextmenu";
import { BsCheck2 } from "react-icons/bs";
import { Menu } from "./menu";
import { useFilterState } from "../../utils/filterState";
import { PriorityOptions, StatusOptions } from "../../types/types";
import { ReactComponent as EstimateIcon } from "../../assets/icons/estimate.svg";

interface Props {
  id: string;
  button: ReactNode;
  className?: string;
}

// Define estimate options with their display labels
const EstimateOptions = [
  { value: null, label: "No estimate" },
  { value: 0, label: "0 points" },
  { value: 1, label: "1 point" },
  { value: 2, label: "2 points" },
  { value: 3, label: "3 points" },
  { value: 5, label: "5 points" },
  { value: 8, label: "8 points" },
  { value: 13, label: "13 points" },
];

function FilterMenu({ id, button, className }: Props) {
  const [filterState, setFilterState] = useFilterState();
  const [keyword, setKeyword] = useState(``);

  let priorities = PriorityOptions;
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    priorities = priorities.filter(
      ([_icon, _priority, label]) =>
        (label as string).toLowerCase().indexOf(normalizedKeyword) !== -1,
    );
  }

  let statuses = StatusOptions;
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    statuses = statuses.filter(
      ([_icon, _status, label]) =>
        label.toLowerCase().indexOf(normalizedKeyword) !== -1,
    );
  }

  let estimates = EstimateOptions;
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    estimates = EstimateOptions.filter(
      (option) => option.label.toLowerCase().indexOf(normalizedKeyword) !== -1,
    );
  }

  // Split filtered estimate options into Task and Project sections
  const taskEstimateOptions = estimates.filter((_, i) => i < 5);
  const projectEstimateOptions = estimates.filter((_, i) => i >= 5);

  const estimateOptions = [
    ...taskEstimateOptions.map((option) => (
      <Menu.Item
        key={`estimate-${option.value === null ? "null" : option.value}`}
        onClick={() => handleEstimateSelect(option.value)}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center grow">
            <EstimateIcon className="mr-3" />
            <span>{option.label}</span>
          </div>
          {filterState.estimate?.some(
            (e) => (e === null && option.value === null) || e === option.value,
          ) && <BsCheck2 className="ml-2" />}
          <span className="ml-2 text-xs text-gray-400">Task</span>
        </div>
      </Menu.Item>
    )),
    ...(taskEstimateOptions.length > 0 && projectEstimateOptions.length > 0
      ? [<Menu.Divider key="estimate-divider" />]
      : []),
    ...projectEstimateOptions.map((option) => (
      <Menu.Item
        key={`estimate-${option.value === null ? "null" : option.value}-project`}
        onClick={() => handleEstimateSelect(option.value)}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center grow">
            <EstimateIcon className="mr-3" />
            <span>{option.label}</span>
          </div>
          {filterState.estimate?.some(
            (e) => (e === null && option.value === null) || e === option.value,
          ) && <BsCheck2 className="ml-2" />}
          <span className="ml-2 text-xs text-gray-400">Project</span>
        </div>
      </Menu.Item>
    )),
  ];

  const priorityOptions = priorities.map(([Icon, priority, label]) => {
    return (
      <Menu.Item
        key={`priority-${priority}`}
        onClick={() => handlePrioritySelect(priority as string)}
      >
        <Icon className="mr-3" />
        <span>{label}</span>
        {filterState.priority?.includes(priority) && (
          <BsCheck2 className="ml-auto" />
        )}
      </Menu.Item>
    );
  });

  const statusOptions = statuses.map(([Icon, status, label]) => {
    return (
      <Menu.Item
        key={`status-${status}`}
        onClick={() => handleStatusSelect(status as string)}
      >
        <Icon className="mr-3" />
        <span>{label}</span>
        {filterState.status?.includes(status) && (
          <BsCheck2 className="ml-auto" />
        )}
      </Menu.Item>
    );
  });

  const handlePrioritySelect = (priority: string) => {
    setKeyword(``);
    const newPriority = filterState.priority || [];
    if (newPriority.includes(priority)) {
      newPriority.splice(newPriority.indexOf(priority), 1);
    } else {
      newPriority.push(priority);
    }
    setFilterState({
      ...filterState,
      priority: newPriority,
    });
  };

  const handleStatusSelect = (status: string) => {
    setKeyword(``);
    const newStatus = filterState.status || [];
    if (newStatus.includes(status)) {
      newStatus.splice(newStatus.indexOf(status), 1);
    } else {
      newStatus.push(status);
    }
    setFilterState({
      ...filterState,
      status: newStatus,
    });
  };

  const handleEstimateSelect = (estimate: number | null) => {
    setKeyword(``);
    const newEstimate = filterState.estimate || [];

    // Special handling for null (No estimate)
    if (estimate === null) {
      // Toggle the special "null" filter
      setFilterState({
        ...filterState,
        estimate: filterState.estimate?.includes(null)
          ? filterState.estimate.filter((e) => e !== null)
          : [...(filterState.estimate || []), null],
      });
      return;
    }

    if (newEstimate.includes(estimate)) {
      newEstimate.splice(newEstimate.indexOf(estimate), 1);
    } else {
      newEstimate.push(estimate);
    }
    setFilterState({
      ...filterState,
      estimate: newEstimate,
    });
  };

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="medium"
          filterKeyword={false}
          className={className}
          searchPlaceholder="Filter by..."
          onKeywordChange={(kw) => setKeyword(kw)}
        >
          {priorityOptions && <Menu.Header>Priority</Menu.Header>}
          {priorityOptions}
          {priorityOptions && statusOptions && <Menu.Divider />}
          {statusOptions && <Menu.Header>Status</Menu.Header>}
          {statusOptions}
          {statusOptions && estimateOptions && <Menu.Divider />}
          {estimateOptions && <Menu.Header>Estimate</Menu.Header>}
          {estimateOptions}
        </Menu>
      </Portal>
    </>
  );
}

export default FilterMenu;
