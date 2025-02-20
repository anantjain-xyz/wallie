import { Outlet } from 'react-router-dom'
import LeftMenu from '../components/LeftMenu'
import { cssTransition, ToastContainer } from 'react-toastify'
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react"

const slideUp = cssTransition({
  enter: `animate__animated animate__slideInUp`,
  exit: `animate__animated animate__slideOutDown`,
})

export default function Root() {
  return (
    <>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
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
      </SignedIn>
    </>
  )
}
