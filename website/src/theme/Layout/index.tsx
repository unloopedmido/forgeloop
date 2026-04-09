import React, {type ReactNode} from 'react';
import Layout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import type {WrapperProps} from '@docusaurus/types';
import { useLocation } from '@docusaurus/router';
import { motion } from 'motion/react';

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): ReactNode {
  const location = useLocation();
  
  return (
    <Layout {...props}>
      <motion.div 
        key={location.pathname} 
        initial={{ opacity: 0, filter: 'blur(4px)', y: 12 }}
        animate={{ opacity: 1, filter: 'blur(0)', y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col min-h-0"
      >
        {props.children}
      </motion.div>
    </Layout>
  );
}
