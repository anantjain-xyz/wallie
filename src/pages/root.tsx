import { Outlet } from 'react-router-dom'
import LeftMenu from '../components/LeftMenu'
import { cssTransition, ToastContainer } from 'react-toastify'
import { useAuth } from "@clerk/clerk-react"

const slideUp = cssTransition({
  enter: `animate__animated animate__slideInUp`,
  exit: `animate__animated animate__slideOutDown`,
})

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
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl={false}
        transition={slideUp}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  )
}
