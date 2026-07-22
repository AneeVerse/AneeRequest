import { Suspense } from 'react';
import NewInvoiceClient from './NewInvoiceClient';

export default function NewInvoicePage() {
    return (
        <Suspense
            fallback={
                <div className="flex-1 flex items-center justify-center text-[#279da6] text-sm font-bold uppercase tracking-widest">
                    Loading…
                </div>
            }
        >
            <NewInvoiceClient />
        </Suspense>
    );
}
