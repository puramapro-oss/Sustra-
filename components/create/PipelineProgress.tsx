'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  FileText,
  Mic,
  ImageIcon,
  Music,
  Film,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type StepStatus = 'waiting' | 'active' | 'done' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const steps: PipelineStep[] = [
  { id: 'script', label: 'Script', icon: <FileText size={18} /> },
  { id: 'voice', label: 'Voix', icon: <Mic size={18} /> },
  { id: 'visuals', label: 'Visuels', icon: <ImageIcon size={18} /> },
  { id: 'music', label: 'Musique', icon: <Music size={18} /> },
  { id: 'assembly', label: 'Montage', icon: <Film size={18} /> },
];

interface PipelineProgressProps {
  currentStep: number; // 0-4
  status: StepStatus;
  statusText?: string;
  className?: string;
}

export default function PipelineProgress({
  currentStep,
  status,
  statusText,
  className,
}: PipelineProgressProps) {
  const getStepStatus = (index: number): StepStatus => {
    if (index < currentStep) return 'done';
    if (index === currentStep) return status;
    return 'waiting';
  };

  const statusStyles: Record<StepStatus, string> = {
    waiting: 'bg-white/5 border-white/10 text-white/20',
    active: 'bg-violet-500/15 border-violet-500/40 text-violet-400',
    done: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    error: 'bg-red-500/15 border-red-500/40 text-red-400',
  };

  const lineStyles: Record<StepStatus, string> = {
    waiting: 'bg-white/10',
    active: 'bg-gradient-to-r from-violet-500 to-violet-500/30',
    done: 'bg-emerald-500/60',
    error: 'bg-red-500/60',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Steps */}
      <div className="flex items-center justify-between relative">
        {steps.map((step, i) => {
          const stepStatus = getStepStatus(i);
          const isLast = i === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2 relative z-10">
                {/* Step circle */}
                <motion.div
                  className={cn(
                    'w-12 h-12 rounded-full border-2 flex items-center justify-center',
                    'transition-all duration-300',
                    statusStyles[stepStatus]
                  )}
                  animate={
                    stepStatus === 'active'
                      ? {
                          boxShadow: [
                            '0 0 0px rgba(139,92,246,0.3)',
                            '0 0 20px rgba(139,92,246,0.4)',
                            '0 0 0px rgba(139,92,246,0.3)',
                          ],
                        }
                      : {}
                  }
                  transition={
                    stepStatus === 'active'
                      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                      : {}
                  }
                >
                  {stepStatus === 'done' ? (
                    <Check size={18} />
                  ) : stepStatus === 'error' ? (
                    <AlertCircle size={18} />
                  ) : stepStatus === 'active' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    step.icon
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-medium font-[family-name:var(--font-exo2)]',
                    stepStatus === 'active'
                      ? 'text-violet-400'
                      : stepStatus === 'done'
                      ? 'text-emerald-400'
                      : stepStatus === 'error'
                      ? 'text-red-400'
                      : 'text-white/30'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 mt-[-24px] rounded-full overflow-hidden bg-white/5">
                  <motion.div
                    className={cn('h-full rounded-full', lineStyles[getStepStatus(i)])}
                    initial={{ width: '0%' }}
                    animate={{
                      width:
                        i < currentStep
                          ? '100%'
                          : i === currentStep && status === 'active'
                          ? '50%'
                          : '0%',
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status text */}
      {statusText && (
        <motion.p
          className="text-center text-sm text-white/50 mt-4 font-[family-name:var(--font-exo2)]"
          key={statusText}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {statusText}
        </motion.p>
      )}
    </div>
  );
}
