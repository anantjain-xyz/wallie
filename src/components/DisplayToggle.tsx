import { Transition } from "@headlessui/react";
import { useClickOutside } from "../hooks/useClickOutside";
import { useRef, useState, useEffect } from "react";
import Select from "./Select";
import { useFilterState } from "../utils/filterState";
import { useUserPreferences } from "../hooks/useUserPreferences";

export default function DisplayToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const [filterState, setFilterState] = useFilterState();
  const [userPreferences, updateUserPreferences] = useUserPreferences();

  useClickOutside(ref, () => {
    if (isOpen) setIsOpen(false);
  });

  // Sync filter state with user preferences when they load
  useEffect(() => {
    if (
      userPreferences.order_by !== filterState.orderBy ||
      userPreferences.order_direction !== filterState.orderDirection
    ) {
      setFilterState({
        ...filterState,
        orderBy: userPreferences.order_by,
        orderDirection: userPreferences.order_direction as "asc" | "desc",
      });
    }
  }, [userPreferences, setFilterState, filterState]);

  const handleOrderByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrderBy = e.target.value;
    setFilterState({
      ...filterState,
      orderBy: newOrderBy,
    });
    updateUserPreferences({ order_by: newOrderBy });
  };

  const handleOrderDirectionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newOrderDirection = e.target.value as "asc" | "desc";
    setFilterState({
      ...filterState,
      orderDirection: newOrderDirection,
    });
    updateUserPreferences({ order_direction: newOrderDirection });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center px-2 py-1 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-1">Display</span>
      </button>

      <Transition
        show={isOpen}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition easy-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
        className="absolute right-0 z-30 mt-2 bg-white rounded-lg shadow-modal w-60"
      >
        <div className="p-4">
          <div className="font-medium text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span>Ordering</span>
              <div className="flex items-center">
                <Select
                  className="text-xs mr-1"
                  value={filterState.orderBy}
                  onChange={handleOrderByChange}
                >
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="created">Created</option>
                  <option value="modified">Updated</option>
                </Select>
                <Select
                  className="text-xs"
                  value={filterState.orderDirection}
                  onChange={handleOrderDirectionChange}
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}
