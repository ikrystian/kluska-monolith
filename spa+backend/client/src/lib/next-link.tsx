import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

const Link = ({ href, children, ...props }: any) => {
    return (
        <RouterLink to={href} {...props}>
            {children}
        </RouterLink>
    );
};

export default Link;
