import { Suspense } from 'react';
import Footer from '@/components/Footer';
import BookingView from '@/components/BookingView';

export default function BookingPage() {
  return (
    <>
      <Suspense><BookingView /></Suspense>
      <Footer />
    </>
  );
}
