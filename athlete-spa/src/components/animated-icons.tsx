import { forwardRef, useEffect, useImperativeHandle, useRef, type ComponentType, type CSSProperties, type Ref } from 'react';
import {
  ActivityIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BookOpenTextIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  CompassIcon,
  DumbbellIcon,
  EyeIcon,
  EyeOffIcon,
  FootprintsIcon,
  GaugeIcon,
  GripVerticalIcon,
  HistoryIcon,
  ImageIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MapIcon,
  MapPinIcon,
  MedalIcon,
  MenuIcon,
  MessageSquareIcon,
  NotebookPenIcon,
  PlayIcon,
  RotateCcwIcon,
  RulerIcon,
  SlidersHorizontalIcon,
  SquareCheckIcon,
  TargetIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
  UtensilsIcon,
  ZapIcon,
} from '@animateicons/react/lucide';

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/** Same call shape as a lucide icon, so `icon: LucideIcon` call sites can take either. */
export interface AnimatedIconProps {
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  /** Accepted for lucide compatibility; animated icons ship a fixed stroke. */
  strokeWidth?: number;
}

export type AnimatedIcon = ComponentType<AnimatedIconProps & { ref?: Ref<AnimatedIconHandle> }>;

type BaseIcon = ComponentType<{
  className?: string;
  style?: CSSProperties;
  size?: number;
  ref?: Ref<AnimatedIconHandle>;
}>;

/**
 * Adapts an animateicons component to the lucide contract used across the app:
 * sized by `className` (`h-5 w-5`) and tinted by `currentColor`.
 *
 * The icon itself is a tiny hover target and there is no hover on touch, so
 * the animation is driven by the nearest link/button instead: it plays when
 * that control is clicked (or hovered, with a mouse).
 */
function animated(Base: BaseIcon, displayName: string): AnimatedIcon {
  const Wrapped = forwardRef<AnimatedIconHandle, AnimatedIconProps>(function AnimatedIconImpl(
    { className, style, 'aria-hidden': ariaHidden },
    ref
  ) {
    const handle = useRef<AnimatedIconHandle>(null);
    const host = useRef<HTMLSpanElement>(null);
    useImperativeHandle(ref, () => ({
      startAnimation: () => handle.current?.startAnimation(),
      stopAnimation: () => handle.current?.stopAnimation(),
    }));

    useEffect(() => {
      const control = host.current?.closest('a, button, [role="button"]') ?? host.current;
      if (!control) return;
      const start = () => handle.current?.startAnimation();
      const stop = () => handle.current?.stopAnimation();
      // Touch has no hover and a tap ends in `pointerleave` straight away, so
      // stopping there would cut the animation short: touch plays it on click
      // and lets it finish. Mouse keeps the hover behaviour.
      const hoverStart = (event: Event) => {
        if ((event as PointerEvent).pointerType === 'mouse') start();
      };
      const hoverStop = (event: Event) => {
        if ((event as PointerEvent).pointerType === 'mouse') stop();
      };
      control.addEventListener('click', start);
      control.addEventListener('pointerenter', hoverStart);
      control.addEventListener('pointerleave', hoverStop);
      return () => {
        control.removeEventListener('click', start);
        control.removeEventListener('pointerenter', hoverStart);
        control.removeEventListener('pointerleave', hoverStop);
      };
    }, []);

    return (
      <span ref={host} className="contents" aria-hidden={ariaHidden}>
        <Base
          ref={handle}
          className={`${className ?? ''} [&>svg]:h-full [&>svg]:w-full`}
          style={style}
        />
      </span>
    );
  });
  Wrapped.displayName = displayName;
  return Wrapped as AnimatedIcon;
}

export const Activity = animated(ActivityIcon, 'Activity');
export const ArrowRight = animated(ArrowRightIcon, 'ArrowRight');
export const Award = animated(MedalIcon, 'Award');
export const BarChart3 = animated(ChartBarIcon, 'BarChart3');
export const BookOpen = animated(BookOpenIcon, 'BookOpen');
export const Calendar = animated(CalendarIcon, 'Calendar');
export const CalendarDays = animated(CalendarDaysIcon, 'CalendarDays');
export const Check = animated(CheckIcon, 'Check');
export const CheckSquare = animated(SquareCheckIcon, 'CheckSquare');
export const ChefHat = animated(UtensilsIcon, 'ChefHat');
export const ClipboardCheck = animated(ClipboardCheckIcon, 'ClipboardCheck');
export const ClipboardList = animated(ClipboardListIcon, 'ClipboardList');
export const Clock = animated(ClockIcon, 'Clock');
export const Compass = animated(CompassIcon, 'Compass');
export const Dumbbell = animated(DumbbellIcon, 'Dumbbell');
export const Eye = animated(EyeIcon, 'Eye');
export const EyeOff = animated(EyeOffIcon, 'EyeOff');
export const Footprints = animated(FootprintsIcon, 'Footprints');
export const GripVertical = animated(GripVerticalIcon, 'GripVertical');
export const History = animated(HistoryIcon, 'History');
export const IdCard = animated(UserIcon, 'IdCard');
export const Images = animated(ImageIcon, 'Images');
export const Layers = animated(LayersIcon, 'Layers');
export const LayoutDashboard = animated(LayoutDashboardIcon, 'LayoutDashboard');
export const LayoutGrid = animated(LayoutGridIcon, 'LayoutGrid');
export const Map = animated(MapIcon, 'Map');
export const MapPin = animated(MapPinIcon, 'MapPin');
export const Menu = animated(MenuIcon, 'Menu');
export const MessageSquare = animated(MessageSquareIcon, 'MessageSquare');
export const Newspaper = animated(BookOpenTextIcon, 'Newspaper');
export const NotebookPen = animated(NotebookPenIcon, 'NotebookPen');
export const Play = animated(PlayIcon, 'Play');
export const RotateCcw = animated(RotateCcwIcon, 'RotateCcw');
export const Ruler = animated(RulerIcon, 'Ruler');
export const SlidersHorizontal = animated(SlidersHorizontalIcon, 'SlidersHorizontal');
export const Target = animated(TargetIcon, 'Target');
export const TrendingUp = animated(TrendingUpIcon, 'TrendingUp');
export const Trophy = animated(TrophyIcon, 'Trophy');
export const User = animated(UserIcon, 'User');
export const UserCheck = animated(UserCheckIcon, 'UserCheck');
export const Users = animated(UsersIcon, 'Users');
export const Users2 = animated(UsersRoundIcon, 'Users2');
export const UtensilsCrossed = animated(UtensilsIcon, 'UtensilsCrossed');
export const Weight = animated(GaugeIcon, 'Weight');
export const Zap = animated(ZapIcon, 'Zap');
