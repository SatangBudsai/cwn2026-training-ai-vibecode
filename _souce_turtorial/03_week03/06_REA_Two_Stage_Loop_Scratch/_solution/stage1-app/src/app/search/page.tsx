import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ResultsView from '@/components/ResultsView';

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense><ResultsView /></Suspense>
      <Footer />
    </>
  );
}
