// Animation library with proper TypeScript support
import { useCallback, useRef, useEffect, useMemo } from 'react';

// Animation types
export interface Animation {
  id: string;
  element?: HTMLElement;
  keyframes?: string;
  duration?: number;
  easing?: string;
  delay?: number;
  onFinish?: () => void;
  onCancel?: () => void;
}

// Animation state
interface AnimationState {
  isPlaying: boolean;
  progress: number;
  startTime: number;
  duration: number;
}

// Animation controller
export class AnimationController {
  private static animations: Map<string, Animation> = new Map();
  private static cleanupTimeouts: Map<string, number> = new Map();

  // Register an animation
  static register(animation: Animation) {
    this.animations.set(animation.id, animation);
    
    if (animation.keyframes) {
      // Add keyframes to document
      const styleSheet = document.createElement('style');
      styleSheet.textContent = animation.keyframes;
      document.head.appendChild(styleSheet);
    }
  }

  // Play an animation
  static play(animationId: string, element?: HTMLElement) {
    const animation = this.animations.get(animationId);
    if (!animation) {
      console.warn(`Animation not found: ${animationId}`);
      return;
    }

    const targetElement = element || document.querySelector(`[data-animation="${animationId}"]`);
    if (!targetElement) {
      console.warn(`Target element not found for animation: ${animationId}`);
      return;
    }

    // Cancel any existing animation
    this.cancel(animationId);
    
    // Apply animation class
    targetElement.classList.remove(...this.getAnimationClasses(animationId, 'before'));
    targetElement.classList.add(...this.getAnimationClasses(animationId, 'active'));
    
    // Create animation state
    const state: AnimationState = {
      isPlaying: true,
      progress: 0,
      startTime: Date.now(),
      duration: animation.duration || 300
    };
    
    // Store cleanup timeout
    if (animation.duration) {
      const timeoutId = setTimeout(() => {
        targetElement.classList.remove(...this.getAnimationClasses(animationId, 'active'));
        targetElement.classList.add(...this.getAnimationClasses(animationId, 'after'));
        this.cleanupTimeouts.delete(animationId);
      }, animation.duration * 1000);
      
      this.cleanupTimeouts.set(animationId, timeoutId);
    }
    
    // Start the animation
    if (animation.keyframes) {
      targetElement.style.animation = `${animation.keyframes} ${animation.duration}ms ${animation.easing || 'ease-in-out'} forwards`;
    }
    
    // Set up progress tracking
    if (animation.onProgress) {
      const progressInterval = setInterval(() => {
        state.progress = Math.min((Date.now() - state.startTime) / (state.duration || 300), 1);
        animation.onProgress?.(state.progress);
      }, 100);
      
      const finishAnimation = () => {
        clearInterval(progressInterval);
        state.progress = 1;
        state.isPlaying = false;
        
        // Call finish callbacks
        animation.onFinish?.();
        animation.onComplete?.();
        
        // Remove animation styles
        setTimeout(() => {
          targetElement.style.animation = '';
          targetElement.classList.remove(...this.getAnimationClasses(animationId, 'active', 'after'));
        }, 50);
      };
      
      const timeoutId = setTimeout(finishAnimation, animation.duration);
      this.cleanupTimeouts.set(animationId, timeoutId);
    }
    
    return state;
  }

  // Cancel an animation
  static cancel(animationId: string) {
    const animation = this.animations.get(animationId);
    if (!animation) return;
    
    const timeoutId = this.cleanupTimeouts.get(animationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.cleanupTimeouts.delete(animationId);
    }
    
    animation.onCancel?.();
    
    const targetElements = document.querySelectorAll(`[data-animation="${animationId}"]`);
    targetElements.forEach(element => {
      element.style.animation = '';
      element.classList.remove(...this.getAnimationClasses(animationId, 'active', 'before'));
    });
    
    this.animations.delete(animationId);
  }

  // Get animation classes
  private getAnimationClasses(animationId: string, ...additionalClasses: string[]) {
    const classes = [`animation-${animationId}`, ...additionalClasses];
    
    return classes;
  }

  // Cleanup on unmount
  static cleanup() {
    // Cancel all active animations
    for (const [id] of this.animations.keys()) {
      this.cancel(id);
    }
    
    // Clear all timeout intervals
    for (const timeoutId of this.cleanupTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.cleanupTimeouts.clear();
    
    // Clean up keyframes
    const styleSheets = document.querySelectorAll('style[data-animation-keyframes]');
    styleSheets.forEach(sheet => sheet.remove());
  }
}

// Utility hooks for animations
export const useAnimation = (animation: Animation, options = {}) => {
  const [state, setState] = React.useState<AnimationState>({
    isPlaying: false,
    progress: 0,
    startTime: 0,
    duration: animation.duration || 300
  });
  
  const play = useCallback(() => {
    const animationState = AnimationController.play(animation.id, options.element);
    setState(animationState);
  }, [animation.id, state]);

  const pause = useCallback(() => {
    AnimationController.pause(animation.id);
  }, [animation.id]);

  const reset = useCallback(() => {
    AnimationController.play(animation.id, options.element, true);
    setState({
      isPlaying: false,
      progress: 0,
      startTime: 0,
      duration: animation.duration || 300
    });
  }, [animation.id]);

  const cancel = useCallback(() => {
    AnimationController.cancel(animation.id);
    setState({
      isPlaying: false,
      progress: 0,
      startTime: 0,
      duration: animation.duration || 300
    });
  }, [animation.id]);

  React.useEffect(() => {
    // Cleanup on unmount
    return () => {
      AnimationController.cleanup();
    };
  }, []);

  return { play, pause, reset, cancel, state };
};

// Preset animations
export const animations = {
  fadeIn: {
    id: 'fade-in',
    duration: 300,
    easing: 'ease-in-out',
    keyframes: `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
  },
  fadeOut: {
    id: 'fade-out',
    duration: 200,
    easing: 'ease-in-out',
    keyframes: `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      }
    `
  },
  slideUp: {
    id: 'slide-up',
    duration: 400,
    easing: 'ease-out',
    keyframes: `
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      }
    `
  },
  slideDown: {
    id: 'slide-down',
    duration: 400,
    easing: 'ease-in-out',
    keyframes: `
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      }
    `
  },
  scaleIn: {
    id: 'scale-in',
    duration: 300,
    easing: 'ease-out',
    keyframes: `
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      }
    `
  },
  pulse: {
    id: 'pulse',
    duration: 1500,
    easing: 'ease-in-out',
    keyframes: `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50%, 100% { transform: scale(1.1); opacity: 1; }
        100%, 100% { transform: scale(1); opacity: 1; }
      }
      }
    `
  },
  bounce: {
    id: 'bounce',
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        20% { transform: translateY(-30px); }
        40% { transform: translateY(-15px); }
        60% { transform: translateY(7.5px); }
        80% { transform: translateY(0); }
        100% { transform: translateY(0); }
      }
      `
    },
  shake: {
    id: 'shake',
    duration: 500,
    easing: 'cubic-bezier(0.36, -0.07, 0.63, 0.9)',
    keyframes: `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 100% { transform: translateX(-2px); }
        20%, 100% { transform: translateX(2px); }
        30%, 100% { transform: translateX(-2px); }
        40%, 100% { transform: translateX(2px); }
        50%, 100% { transform: translateX(-2px); }
        60%, 100% { transform: translateX(2px); }
        70%, 100% { transform: translateX(-2px); }
        80%, 100% { transform: translateX(-2px); }
        90%, 100% { transform: translateX(-2px); }
        100%, 100% { transform: translateX(0); }
      }
      }
    `
  }
};

// Staggered animations utility
export const createStaggeredAnimation = (baseAnimation, options = {}) => {
  return {
    ...baseAnimation,
    id: options.id || `stagger-${baseAnimation.id}`,
    delay: options.delay || 100,
    stagger: options.stagger || 50
  };
};