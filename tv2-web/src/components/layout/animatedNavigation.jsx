import React, { useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useLocation,
  useNavigate
} from 'react-router-dom';

export function useAnimatedNavigate() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback((to, options = {}) => {
    const nextPath = typeof to === 'string' ? to : to?.pathname;
    const changesPage = typeof nextPath === 'string'
      && nextPath.startsWith('/')
      && nextPath.split(/[?#]/, 1)[0] !== location.pathname;
    // Commit the route and scroll position before the next paint, keeping the shell visible.
    flushSync(() => navigate(to, options));
    if (changesPage && !options.preventScrollReset) window.scrollTo(0, 0);
  }, [location.pathname, navigate]);
}

function useAnimatedLinkClick(to, onClick, options) {
  const navigate = useAnimatedNavigate();

  return (event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey
      || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to, options);
  };
}

export const Link = React.forwardRef(function AnimatedLink({
  to, onClick, replace, state, preventScrollReset, target, download, ...rest
}, ref) {
  const handleClick = useAnimatedLinkClick(to, onClick, { replace, state, preventScrollReset });
  return <RouterLink ref={ref} to={to} target={target} download={download}
    onClick={(target && target !== '_self') || download ? onClick : handleClick} {...rest} />;
});

export const NavLink = React.forwardRef(function AnimatedNavLink({
  to, onClick, replace, state, preventScrollReset, target, download, ...rest
}, ref) {
  const handleClick = useAnimatedLinkClick(to, onClick, { replace, state, preventScrollReset });
  return <RouterNavLink ref={ref} to={to} target={target} download={download}
    onClick={(target && target !== '_self') || download ? onClick : handleClick} {...rest} />;
});
