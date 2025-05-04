import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface TransferData {
  senderATA:   string;
  receiverATA: string;
  amount:      string;
  mintAddress: string;
  decimals:    string;
}
interface BurnData {
  senderATA:   string;
  amount:      string;
  mintAddress: string;
  decimals:    string;
  item_amount: string;
}
// In-memory ticket store
const pending = new Map<string,TransferData>();
const pendingBurn = new Map<string,BurnData>();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//Plugin POSTs here to get a one-time ticket
app.post('/confirm', (req, res) => {
  // cast the incoming JSON to our TransferData shape
  const { senderATA, receiverATA, amount, mintAddress, decimals } =
    req.body as TransferData;

  if (!senderATA || !receiverATA || !amount || !mintAddress || !decimals) {
    res.status(400).json({ success: false, error: 'Missing fields' });
    return;
  }

  const ticket = uuidv4();
  pending.set(ticket, { senderATA, receiverATA, amount, mintAddress, decimals });
  console.log(`🔖 Created ticket ${ticket}`, req.body);
  res.json({ success: true, ticket });
  return ;
});

// Plugin POSTs here to get a one-time ticket
app.post('/buy', (req, res) => {
  // cast the incoming JSON to our BurnData shape
  const { senderATA, amount, mintAddress, decimals, item_amount } =
    req.body as BurnData;

  if (!senderATA || !amount || !mintAddress || !decimals) {
    res.status(400).json({ success: false, error: 'Missing fields' });
    return;
  }

  const ticket = uuidv4();
  pendingBurn.set(ticket, { senderATA, amount, mintAddress, decimals, item_amount });
  console.log(`🔖 Created ticket ${ticket}`, req.body);
  res.json({ success: true, ticket });
  return ;
});


//Player clicks this URL → we lookup the ticket and render the Transfer page
app.get('/confirm', (req, res) => {
  const ticket = String(req.query.ticket);
  if (!ticket || !pending.has(ticket)) {
    res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <title>Ticket Error</title>
      <style>
        /* full-screen flex center */
        html, body {
          height: 100%;
          margin: 0;
        }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffe6e6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #800000;
        }
        /* error card */
        .error-container {
          background: #fff0f0;
          border: 1px solid #ffcccc;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        .error-container h1 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .error-container p {
          margin-bottom: 1.5rem;
        }
        .error-container a {
          display: inline-block;
          padding: 0.6rem 1.2rem;
          background: #800000;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .error-container a:hover {
          background: #660000;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>❌ Invalid or Expired Ticket</h1>
        <p>Please request a new one to continue.</p>
        <a href="/">Go back to start</a>
      </div>
    </body>
    </html>
  `);
    return;
  }

  const { senderATA, receiverATA, amount, mintAddress, decimals } =
    pending.get(ticket)!;
  pending.delete(ticket);

  // Render the confirmation page
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Confirm SPL Transfer</title>
        <style>
          /* Page reset & base */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            height: 100%;
            margin: 0;
          }
          body {
            display: flex;
            align-items: center;       /* vertical center */
            justify-content: center;   /* horizontal center */
            background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }

          /* wrap your content in a <div class="container">…</div> */
          .container {
            background: rgba(255,255,255,0.85);
            padding: 2.5rem;
            border-radius: 10px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;     /* center children horizontally */
            text-align: center;      /* center text */
            box-sizing: border-box;
          }
          .container, 
          .container .details li,
          .container .details li span {
            overflow-wrap: break-word;
            word-break: break-all;
          }
          /* give some breathing room */
          .container > h1 {
            margin-bottom: 1rem;
          }
          .container .details {
            list-style: none;
            padding: 0;
            margin: 0 0 1.5rem;
            width: 100%;
          }
          .container .details li {
            display: flex;
            flex-wrap: wrap;   
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .container .details li:last-child {
            border-bottom: none;
          }

          /* full-width button under the list */
          #confirm {
            width: 100%;
            padding: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
            color: #fff;
            background: #3182ce;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s ease;
          }
          #confirm:hover:not(:disabled) {
            background: #2b6cb0;
          }
          #confirm:disabled {
            background: #a0aec0;
            cursor: not-allowed;
          }
          .container .details {
            list-style: none;      /* no bullets */
            margin: 0;             /* reset default UL margins */
            padding: 0;            /* reset default UL padding */
          }

          /* make the LI take the full width, with label/value alignment */
          .container .details li {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e2e8f0;
            list-style: none;      /* just to be extra sure */
            width: 100%;
          }

          /* break super-long addresses so they wrap instead of overflow */
          .container .details li span {
            max-width: 70%;
            word-break: break-all;
            flex: 1 1 65%; 
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Confirm Your Transfer</h1>
          <ul class="details">
            <li><strong>From ATA:</strong>   ${senderATA}</li>
            <li><strong>To ATA:</strong>     ${receiverATA}</li>
            <li><strong>Amount:</strong>     ${amount}</li>
            <li><strong>Mint:</strong>       ${mintAddress}</li>
            <li><strong>Decimals:</strong>   ${decimals}</li>
          </ul>
          <button id="confirm">Sign & Send</button>
          <script type="module">
            import { sendToken } from '/send_token.js';
            const btn = document.getElementById('confirm');
            let inFlight = false;
            btn.onclick = async () => {
              if (inFlight) return;
              inFlight = true;
              btn.disabled = true;
              btn.textContent = 'Waiting for signature...';
              try {
                const sig = await sendToken(
                  '${senderATA}',
                  '${receiverATA}',
                  Number('${amount}'),
                  '${mintAddress}',
                  Number('${decimals}')
                );
                console.log('[confirm page] sendToken returned', sig);
                btn.textContent = 'Done! You can now close this tab.';
                alert('🎉 Transaction sent!\\n' + sig);
                
              } catch (e) {
                console.error('[confirm page] sendToken threw', e);
                alert('❌ ' + e.message);
                inFlight = false;
                btn.disabled = false;
                btn.textContent = 'Sign & Send';
              }
            };
          </script>
        </div>
      </body>
    </html>
  `);
});

//Player clicks this URL → we lookup the ticket and render the Burn page
app.get('/buy', (req, res) => {
  const ticket = String(req.query.ticket);
  if (!ticket || !pendingBurn.has(ticket)) {
    res.status(404).send(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>Ticket Error</title>
        <style>
          /* full-screen flex center */
          html, body {
            height: 100%;
            margin: 0;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffe6e6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #800000;
          }
          /* error card */
          .error-container {
            background: #fff0f0;
            border: 1px solid #ffcccc;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            text-align: center;
            max-width: 400px;
            width: 90%;
          }
          .error-container h1 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          .error-container p {
            margin-bottom: 1.5rem;
          }
          .error-container a {
            display: inline-block;
            padding: 0.6rem 1.2rem;
            background: #800000;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            transition: background 0.2s ease;
          }
          .error-container a:hover {
            background: #660000;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>❌ Invalid or Expired Ticket</h1>
          <p>Please request a new one to continue.</p>
          <a href="/">Go back to start</a>
        </div>
      </body>
      </html>
  `
    );
    return;
  }

  const { senderATA, amount, mintAddress, decimals, item_amount } =
    pendingBurn.get(ticket)!;
  pendingBurn.delete(ticket);

  // Render the confirmation page
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Confirm SPL Transfer</title>
        <style>
          /* Page reset & base */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            height: 100%;
            margin: 0;
          }
          body {
            display: flex;
            align-items: center;       /* vertical center */
            justify-content: center;   /* horizontal center */
            background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }

          /* wrap your content in a <div class="container">…</div> */
          .container {
            background: rgba(255,255,255,0.85);
            padding: 2.5rem;
            border-radius: 10px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;     /* center children horizontally */
            text-align: center;      /* center text */
            box-sizing: border-box;
          }
          .container, 
          .container .details li,
          .container .details li span {
            overflow-wrap: break-word;
            word-break: break-all;
          }
          /* give some breathing room */
          .container > h1 {
            margin-bottom: 1rem;
          }
          .container .details {
            list-style: none;
            padding: 0;
            margin: 0 0 1.5rem;
            width: 100%;
          }
          .container .details li {
            display: flex;
            flex-wrap: wrap;   
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .container .details li:last-child {
            border-bottom: none;
          }

          /* full-width button under the list */
          #confirm {
            width: 100%;
            padding: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
            color: #fff;
            background: #3182ce;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s ease;
          }
          #confirm:hover:not(:disabled) {
            background: #2b6cb0;
          }
          #confirm:disabled {
            background: #a0aec0;
            cursor: not-allowed;
          }
          .container .details {
            list-style: none;      /* no bullets */
            margin: 0;             /* reset default UL margins */
            padding: 0;            /* reset default UL padding */
          }

          /* make the LI take the full width, with label/value alignment */
          .container .details li {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e2e8f0;
            list-style: none;      /* just to be extra sure */
            width: 100%;
          }

          /* break super-long addresses so they wrap instead of overflow */
          .container .details li span {
            max-width: 70%;
            word-break: break-all;
            flex: 1 1 65%; 
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Confirm Your Buy Transaction</h1>
          <ul class="details">
            <li><strong>ATA:</strong>   ${senderATA}</li>
            <li><strong>Amount:</strong>     ${amount}</li>
            <li><strong>Item Amount:</strong>       ${item_amount}</li>
          </ul>
          <button id="confirm">Confirm Buy</button>
          <script type="module">
            import { burnToken } from '/burn_token.js';
            const btn = document.getElementById('confirm');
            let inFlight = false;
            btn.onclick = async () => {
              if (inFlight) return;
              inFlight = true;
              btn.disabled = true;
              btn.textContent = 'Waiting for signature...';
              try {
                const sig = await burnToken(
                  '${senderATA}',
                  Number('${amount}'),
                  '${mintAddress}',
                  Number('${decimals}')
                );
                console.log('[confirm page] burnToken returned', sig);
                btn.textContent = 'Done! You can now close this tab.';
                alert('🎉 Successfully purchase!\\n' + sig);
                
              } catch (e) {
                console.error('[confirm page] burnToken threw', e);
                alert('❌ ' + e.message);
                inFlight = false;
                btn.disabled = false;
                btn.textContent = 'Confirm Buy';
              }
            };
          </script>
        </div>
      </body>
    </html>
  `);
});
// health-check
app.get('/', (_req, res) => {res.send('✅ Server is running!')});

app.listen(3000, () => {
  console.log('🚀 Listening on http://localhost:3000');
});
