import { Outlet } from 'react-router-dom'
import LeftMenu from '../components/LeftMenu'
import { useAuth } from "@clerk/clerk-react"

export default function Root() {
  const { isLoaded } = useAuth();

  // Don't render anything until Clerk is initialized
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen overflow-y-hidden">
      <LeftMenu />
      <Outlet />
    </div>
  )
}
