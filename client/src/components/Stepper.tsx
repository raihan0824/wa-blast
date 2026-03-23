const STEPS = ['Connect', 'Upload', 'Template', 'Preview', 'Blast'];

interface StepperProps {
  currentStep: number;
}

export function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : isDone
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {isDone ? '✓' : step}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                isActive ? 'font-semibold text-gray-900' : 'text-gray-500'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
