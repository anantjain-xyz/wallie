import { Outlet, useLocation } from "react-router-dom";
import LeftMenu from "../components/LeftMenu";
import { useAuth } from "@clerk/clerk-react";

export default function Root() {
  const { isLoaded } = useAuth();
  const location = useLocation();
  const hideSidebar = location.pathname === "/create-workspace";

  // Don't render anything until Clerk is initialized
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full h-screen overflow-y-hidden">
        {!hideSidebar && <LeftMenu />}
        <Outlet />
      </div>
      {/* Portal target for CommandBar */}
      <div id="command-bar-portal"></div>
    </>
  );
}
