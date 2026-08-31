import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { useRef, useState } from 'react';

function useScopedPullToRefresh(onRefresh) {
    const scrollRef = useRef(null);
    const [{ pull }, api] = useSpring(() => ({ pull: 0 }));
    const [refreshing, setRefreshing] = useState(false);

    const bind = useDrag(({ down, movement: [, my], last }) => {
        const el = scrollRef.current;
        const atTop = el && el.scrollTop <= 0;
        if (!atTop || my < 0 || refreshing) {
            api.start({ pull: 0 });
            return;
        }
        if (down) {
            api.start({ pull: Math.min(my * 0.5, 100), immediate: true });
            return;
        }
        if (last) {
            if (my > 100) {
                setRefreshing(true);
                api.start({ pull: 60 });
                Promise.resolve(onRefresh()).finally(() => {
                    setRefreshing(false);
                    api.start({ pull: 0 });
                });
            } else {
                api.start({ pull: 0 });
            }
        }
    }, { axis: 'y', pointer: { touch: true }, eventOptions: { passive: false } });

    return { scrollRef, bindPull: bind, pull, refreshing };
}

export default useScopedPullToRefresh;
