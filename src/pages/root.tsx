import { Outlet } from 'react-router-dom'
import LeftMenu from '../components/LeftMenu'
import { cssTransition, ToastContainer } from 'react-toastify'
import { SignedIn, SignedOut } from "@clerk/clerk-react"
import SignInPage from '../components/SignInPage'

const slideUp = cssTransition({
  enter: `animate__animated animate__slideInUp`,
  exit: `animate__animated animate__slideOutDown`,
})

export default function Root() {
  return (
    <>
      <SignedOut>
        <SignInPage />
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
