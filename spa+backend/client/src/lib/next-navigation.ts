import { useNavigate, useLocation, useParams } from 'react-router-dom';

export const useRouter = () => {
    const navigate = useNavigate();
    return {
        push: (path: string) => navigate(path),
        replace: (path: string) => navigate(path, { replace: true }),
        back: () => navigate(-1),
    };
};

export const usePathname = () => {
    const location = useLocation();
    return location.pathname;
};

export const useSearchParams = () => {
    const location = useLocation();
    return new URLSearchParams(location.search);
};

export { useParams }; 
