import { toast } from 'react-toastify'
import { ReactNode } from 'react'

export function showInfo(msg: ReactNode, title: string = ``) {
  //TODO: make notification showing from bottom
  const content = (
    <div className="flex flex-col">
      {title !== `` && (
        <div
          className={`font-medium text-sm w-full text-gray-700 flex items-center`}
        >
          <span className="flex items-center justify-center w-4 h-4 bg-blue-700 rounded-full">
            <svg width="10" height="7" viewBox="0 0 9 7" fill="#fff">
              <path d="M3.29974 4.8648L1.64132 3.20637C1.45492 3.01998 1.15383 3.01998 0.967432 3.20637C0.781038 3.39277 0.781038 3.69387 0.967432 3.88026L2.96519 5.87802C3.15158 6.06441 3.45268 6.06441 3.63907 5.87802L8.6956 0.821492C8.88199 0.635099 8.88199 0.334001 8.6956 0.147608C8.50921 -0.0387859 8.20811 -0.0387859 8.02171 0.147608L3.29974 4.8648Z"></path>
            </svg>
          </span>
          <span className="ml-2">{title}</span>
        </div>
      )}
      <div className="w-full mt-2 text-xs font-normal text-gray-500">{msg}</div>
    </div>
  )
  toast(content, {
    position: `bottom-right`,
  })
}

export function showSuccess(msg: ReactNode, title: string = ``) {
  const content = (
    <div className="flex flex-col">
      {title !== `` && (
        <div
          className={`font-medium text-sm w-full text-gray-700 flex items-center`}
        >
          <span className="flex items-center justify-center w-4 h-4 bg-green-600 rounded-full">
            <svg width="10" height="7" viewBox="0 0 9 7" fill="#fff">
              <path d="M3.29974 4.8648L1.64132 3.20637C1.45492 3.01998 1.15383 3.01998 0.967432 3.20637C0.781038 3.39277 0.781038 3.69387 0.967432 3.88026L2.96519 5.87802C3.15158 6.06441 3.45268 6.06441 3.63907 5.87802L8.6956 0.821492C8.88199 0.635099 8.88199 0.334001 8.6956 0.147608C8.50921 -0.0387859 8.20811 -0.0387859 8.02171 0.147608L3.29974 4.8648Z"></path>
            </svg>
          </span>
          <span className="ml-2">{title}</span>
        </div>
      )}
      <div className="w-full mt-2 text-xs font-normal text-gray-500">{msg}</div>
    </div>
  )
  toast(content, {
    position: `bottom-right`,
  })
}

export function showWarning(msg: ReactNode, title: string = ``) {
  //TODO: make notification showing from bottom
  const content = (
    <div className="flex flex-col">
      {title !== `` && (
        <div
          className={`font-medium text-sm w-full text-gray-700 flex items-center`}
        >
          <span className="flex items-center justify-center w-4 h-4 bg-gray-200 rounded-full">
            <svg width="4" height="9" viewBox="0 0 3 9">
              <path d="M0.920455 9H1.92614V2.45455H0.920455V9ZM1.43182 1.38068C1.82386 1.38068 2.14773 1.07386 2.14773 0.698864C2.14773 0.323864 1.82386 0.0170453 1.43182 0.0170453C1.03977 0.0170453 0.715909 0.323864 0.715909 0.698864C0.715909 1.07386 1.03977 1.38068 1.43182 1.38068Z"></path>
            </svg>
          </span>
          <span className="ml-2">{title}</span>
        </div>
      )}
      <div className="w-full mt-2 text-xs font-normal text-gray-500">{msg}</div>
    </div>
  )
  toast(content, {
    position: `bottom-right`,
  })
}

export function showError(msg: ReactNode, title: string = ``) {
  const content = (
    <div className="flex flex-col">
      {title !== `` && (
        <div
          className={`font-medium text-sm w-full text-gray-700 flex items-center`}
        >
          <span className="flex items-center justify-center w-4 h-4 bg-red-600 rounded-full">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="#fff">
              <path d="M7.53033 0.46967C7.82322 0.762563 7.82322 1.23744 7.53033 1.53033L4.53033 4.53033C4.23744 4.82322 3.76256 4.82322 3.46967 4.53033L0.46967 1.53033C0.176777 1.23744 0.176777 0.762563 0.46967 0.46967C0.762563 0.176777 1.23744 0.176777 1.53033 0.46967L4 2.93934L6.46967 0.46967C6.76256 0.176777 7.23744 0.176777 7.53033 0.46967Z" />
              <path d="M7.53033 6.46967C7.82322 6.76256 7.82322 7.23744 7.53033 7.53033C7.23744 7.82322 6.76256 7.82322 6.46967 7.53033L4 5.06066L1.53033 7.53033C1.23744 7.82322 0.762563 7.82322 0.46967 7.53033C0.176777 7.23744 0.176777 6.76256 0.46967 6.46967L3.46967 3.46967C3.76256 3.17678 4.23744 3.17678 4.53033 3.46967L7.53033 6.46967Z" />
            </svg>
          </span>
          <span className="ml-2">{title}</span>
        </div>
      )}
      <div className="w-full mt-2 text-xs font-normal text-gray-500">{msg}</div>
    </div>
  )
  toast(content, {
    position: `bottom-right`,
  })
}
