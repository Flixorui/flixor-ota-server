import { AppProps } from 'next/app';
import Providers from './ChakraProvider';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const AppComponent = Component as any;
  return (
    <Providers>
      <AppComponent {...pageProps} />
    </Providers>
  );
}

export default MyApp;
