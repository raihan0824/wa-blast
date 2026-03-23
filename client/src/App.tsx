import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { Stepper } from './components/Stepper';
import { AuthStep } from './components/AuthStep';
import { UploadStep } from './components/UploadStep';
import { TemplateStep } from './components/TemplateStep';
import { PreviewStep } from './components/PreviewStep';
import { BlastStep } from './components/BlastStep';
import type { Contact } from './lib/api';

function App() {
  const socket = useSocket();
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [template, setTemplate] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          WA Blast
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Send personalized WhatsApp messages at scale
        </p>

        <Stepper currentStep={step} />

        <div className="bg-white rounded-xl shadow-sm border p-8">
          {step === 1 && (
            <AuthStep socket={socket} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <UploadStep
              onNext={(c) => {
                setContacts(c);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <TemplateStep
              contacts={contacts}
              onNext={(t) => {
                setTemplate(t);
                setStep(4);
              }}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <PreviewStep
              contacts={contacts}
              template={template}
              onConfirm={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <BlastStep
              socket={socket}
              contacts={contacts}
              template={template}
              onReset={() => {
                setContacts([]);
                setTemplate('');
                setStep(2);
              }}
            />
          )}
        </div>

        <footer className="text-center text-gray-400 text-sm mt-8 pb-4">
          Created by Raihan Afiandi
        </footer>
      </div>
    </div>
  );
}

export default App;
