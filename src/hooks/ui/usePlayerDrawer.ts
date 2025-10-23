import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

export interface DrawerSize {
  width: number;
  maxWidth: number;
  minWidth: number;
}

export interface PlayerDrawerState {
  isDragging: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
  volume: number;
  showControls: boolean;
  drawerSize: DrawerSize;
  displayVolume: number; // 用于显示的音量值（静音时为0）
}

type PlayerDrawerAction =
  | { type: "SET_DRAGGING"; payload: boolean }
  | { type: "TOGGLE_FULLSCREEN" }
  | { type: "TOGGLE_MUTE" }
  | { type: "SET_VOLUME"; payload: number }
  | { type: "TOGGLE_CONTROLS" }
  | { type: "SHOW_CONTROLS" }
  | { type: "HIDE_CONTROLS" }
  | { type: "SET_DRAWER_SIZE"; payload: Partial<DrawerSize> };

const initialState: PlayerDrawerState = {
  isDragging: false,
  isFullscreen: false,
  isMuted: false,
  volume: 1,
  displayVolume: 1,
  showControls: true,
  drawerSize: {
    width: 0.666,
    maxWidth: 0.9,
    minWidth: 0.4,
  },
};

function playerDrawerReducer(
  state: PlayerDrawerState,
  action: PlayerDrawerAction,
): PlayerDrawerState {
  switch (action.type) {
    case "SET_DRAGGING":
      return { ...state, isDragging: action.payload };

    case "TOGGLE_FULLSCREEN":
      return { ...state, isFullscreen: !state.isFullscreen };

    case "TOGGLE_MUTE": {
      const newMutedState = !state.isMuted;
      const newVolume = newMutedState ? 0 : state.volume === 0 ? 1 : state.volume;
      const newDisplayVolume = newMutedState ? 0 : newVolume;
      return {
        ...state,
        isMuted: newMutedState,
        volume: newVolume,
        displayVolume: newDisplayVolume,
      };
    }

    case "SET_VOLUME": {
      const clampedVolume = Math.max(0, Math.min(1, action.payload));
      const newMuted = clampedVolume === 0 ? true : state.isMuted;
      const newDisplayVolumeForSet = newMuted ? 0 : clampedVolume;
      return {
        ...state,
        volume: clampedVolume,
        isMuted: newMuted,
        displayVolume: newDisplayVolumeForSet,
      };
    }

    case "TOGGLE_CONTROLS":
      return { ...state, showControls: !state.showControls };

    case "SHOW_CONTROLS":
      return { ...state, showControls: true };

    case "HIDE_CONTROLS":
      return { ...state, showControls: false };

    case "SET_DRAWER_SIZE":
      return {
        ...state,
        drawerSize: { ...state.drawerSize, ...action.payload },
      };

    default:
      return state;
  }
}

export function usePlayerDrawer(initialWidth: number = 0.666) {
  const [state, dispatch] = useReducer(playerDrawerReducer, {
    ...initialState,
    drawerSize: {
      ...initialState.drawerSize,
      width: initialWidth,
    },
  });

  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 重置控制条显示计时器
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      dispatch({ type: "HIDE_CONTROLS" });
    }, 3000);
  }, []);

  // 显示控制条
  const showControlsBar = useCallback(() => {
    dispatch({ type: "SHOW_CONTROLS" });
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // 开始拖拽调整大小
  const startResize = useCallback(
    (clientX: number) => {
      dispatch({ type: "SET_DRAGGING", payload: true });
      dragStartX.current = clientX;
      dragStartWidth.current = state.drawerSize.width;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [state.drawerSize.width],
  );

  // 处理拖拽
  const handleResize = useCallback(
    (clientX: number) => {
      if (!state.isDragging) return;

      const deltaX = clientX - dragStartX.current;
      const windowWidth = window.innerWidth;
      const deltaPercent = deltaX / windowWidth;

      let newWidth = dragStartWidth.current - deltaPercent;
      newWidth = Math.max(state.drawerSize.minWidth, Math.min(state.drawerSize.maxWidth, newWidth));

      dispatch({ type: "SET_DRAWER_SIZE", payload: { width: newWidth } });
    },
    [state.isDragging, state.drawerSize.minWidth, state.drawerSize.maxWidth],
  );

  // 结束拖拽
  const endResize = useCallback(() => {
    dispatch({ type: "SET_DRAGGING", payload: false });
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    dispatch({ type: "TOGGLE_FULLSCREEN" });
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    dispatch({ type: "TOGGLE_MUTE" });
  }, []);

  // 设置音量
  const setVolume = useCallback((volume: number) => {
    dispatch({ type: "SET_VOLUME", payload: volume });
  }, []);

  // 切换控制条显示
  const toggleControls = useCallback(() => {
    dispatch({ type: "TOGGLE_CONTROLS" });
  }, []);

  const nudgeWidth = useCallback(
    (delta: number) => {
      const current = state.drawerSize.width;
      const newWidth = Math.max(
        state.drawerSize.minWidth,
        Math.min(state.drawerSize.maxWidth, current + delta),
      );
      dispatch({ type: "SET_DRAWER_SIZE", payload: { width: newWidth } });
    },
    [state.drawerSize.maxWidth, state.drawerSize.minWidth, state.drawerSize.width],
  );

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "h":
        case "H":
          toggleControls();
          break;
      }
    },
    [toggleMute, toggleFullscreen, toggleControls],
  );

  // 清理计时器
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // 自动隐藏控制条
  useEffect(() => {
    if (state.showControls) {
      resetControlsTimeout();
    }
  }, [state.showControls, resetControlsTimeout]);

  const actions = useMemo(
    () => ({
      startResize,
      handleResize,
      endResize,
      toggleFullscreen,
      toggleMute,
      setVolume,
      toggleControls,
      showControlsBar,
      nudgeWidth,
      handleKeyDown,
    }),
    [
      startResize,
      handleResize,
      endResize,
      toggleFullscreen,
      toggleMute,
      setVolume,
      toggleControls,
      showControlsBar,
      nudgeWidth,
      handleKeyDown,
    ],
  );

  return {
    state,
    actions,
  };
}
