import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { ScrollView, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps, type View } from 'react-native';

type FieldId = string;

type FieldRecord = {
  ref: RefObject<View | null>;
  hasError: boolean;
};

type MeasurableScrollView = ScrollView & {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

type FormErrorScrollContextValue = {
  registerField: (id: FieldId, ref: RefObject<View | null>) => void;
  setFieldError: (id: FieldId, hasError: boolean) => void;
};

const FormErrorScrollContext = createContext<FormErrorScrollContextValue | null>(null);

type Props = Omit<ScrollViewProps, 'children'> & {
  children: ReactNode;
};

export const FormScrollView = forwardRef<ScrollView, Props>(function FormScrollView(
  { children, onScroll, scrollEventThrottle, ...props },
  forwardedRef,
) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const fieldsRef = useRef(new Map<FieldId, FieldRecord>());
  const frameRef = useRef<number | null>(null);

  useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

  const scrollToFirstError = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const scrollView = scrollRef.current as MeasurableScrollView | null;
      const errorFields = Array.from(fieldsRef.current.values()).filter((field) => field.hasError && field.ref.current);
      if (!scrollView || errorFields.length === 0) return;

      scrollView.measureInWindow((_, scrollWindowY) => {
        const measured: number[] = [];
        let pending = errorFields.length;

        const finish = () => {
          pending -= 1;
          if (pending > 0 || measured.length === 0) return;

          const y = Math.max(0, Math.min(...measured) - 12);
          scrollView.scrollTo({ y, animated: true });
        };

        errorFields.forEach((field) => {
          const fieldNode = field.ref.current;
          if (!fieldNode) {
            finish();
            return;
          }

          fieldNode.measureInWindow((__, fieldWindowY, ___, height) => {
            if (height > 0) {
              measured.push(scrollYRef.current + fieldWindowY - scrollWindowY);
            }
            finish();
          });
        });
      });
    });
  }, []);

  const registerField = useCallback((id: FieldId, ref: RefObject<View | null>) => {
    const existing = fieldsRef.current.get(id);
    fieldsRef.current.set(id, { ref, hasError: existing?.hasError ?? false });
  }, []);

  const setFieldError = useCallback(
    (id: FieldId, hasError: boolean) => {
      const existing = fieldsRef.current.get(id);
      if (!existing) return;
      fieldsRef.current.set(id, { ...existing, hasError });
      if (hasError) scrollToFirstError();
    },
    [scrollToFirstError],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const contextValue = useMemo(
    () => ({ registerField, setFieldError }),
    [registerField, setFieldError],
  );

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return (
    <FormErrorScrollContext.Provider value={contextValue}>
      <ScrollView
        {...props}
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}>
        {children}
      </ScrollView>
    </FormErrorScrollContext.Provider>
  );
});

export function useErrorScrollField(error?: string | null) {
  const context = useContext(FormErrorScrollContext);
  const id = useId();
  const fieldRef = useRef<View | null>(null);

  useEffect(() => {
    if (!context) return;
    context.registerField(id, fieldRef);
  }, [context, id]);

  useEffect(() => {
    if (!context) return;
    context.setFieldError(id, !!error);
  }, [context, error, id]);

  return fieldRef;
}
