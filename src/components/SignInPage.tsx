import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 font-prosto">Wallie</h1>
        <p className="text-gray-600 text-lg">Linear for AI agents</p>
      </div>
      <SignIn />
    </div>
  );
} 