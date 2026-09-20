import { whatsappSmsChannelService } from '../services/whatsapp-sms-channel.service';

async function runTests() {
  console.log('--- WhatsApp / SMS Channel Localization Tests ---');

  // Test 1: English Check Price
  const enPrice = await whatsappSmsChannelService.handleIncomingMessage('+919000111222', 'PRICE ONION NASHIK');
  if (enPrice.intentRecognized !== 'CHECK_PRICE' || enPrice.languageDetected !== 'en') {
    throw new Error(`EN Price failed: ${JSON.stringify(enPrice)}`);
  }
  if (!enPrice.replyText.includes('KrishiSetu market prices') || !enPrice.replyText.includes('Price: INR')) {
    throw new Error(`EN Price copy mismatch: ${enPrice.replyText}`);
  }
  console.log('✓ English CHECK_PRICE passed');

  // Test 2: English My Offers
  const enOffers = await whatsappSmsChannelService.handleIncomingMessage('+919000111222', 'MY OFFERS');
  if (enOffers.intentRecognized !== 'MY_OFFERS' || enOffers.languageDetected !== 'en') {
    throw new Error(`EN Offers failed: ${JSON.stringify(enOffers)}`);
  }
  if (!enOffers.replyText.includes('My Offers & Payments')) {
    throw new Error(`EN Offers copy mismatch: ${enOffers.replyText}`);
  }
  console.log('✓ English MY_OFFERS passed');

  // Test 3: Hindi Check Price
  const hiPrice = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', 'दाम प्याज नाशिक');
  if (hiPrice.intentRecognized !== 'CHECK_PRICE' || hiPrice.languageDetected !== 'hi') {
    throw new Error(`HI Price failed: ${JSON.stringify(hiPrice)}`);
  }
  if (!hiPrice.replyText.includes('कृषिसेतु मंडी भाव') || !hiPrice.replyText.includes('भाव: ₹')) {
    throw new Error(`HI Price copy mismatch: ${hiPrice.replyText}`);
  }
  console.log('✓ Hindi CHECK_PRICE passed');

  // Test 4: Hindi My Offers
  const hiOffers = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', 'मेरे प्रस्ताव');
  if (hiOffers.intentRecognized !== 'MY_OFFERS' || hiOffers.languageDetected !== 'hi') {
    throw new Error(`HI Offers failed: ${JSON.stringify(hiOffers)}`);
  }
  if (!hiOffers.replyText.includes('मेरे प्रस्ताव और भुगतान') || !hiOffers.replyText.includes('किसान:')) {
    throw new Error(`HI Offers copy mismatch: ${hiOffers.replyText}`);
  }
  console.log('✓ Hindi MY_OFFERS passed');

  // Test 5: Marathi Check Price
  const mrPrice = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', 'भाव कांदा नाशिक');
  if (mrPrice.intentRecognized !== 'CHECK_PRICE' || mrPrice.languageDetected !== 'mr') {
    throw new Error(`MR Price failed: ${JSON.stringify(mrPrice)}`);
  }
  if (!mrPrice.replyText.includes('कृषीसेतू मार्केट यार्ड भाव') || !mrPrice.replyText.includes('भाव: ₹')) {
    throw new Error(`MR Price copy mismatch: ${mrPrice.replyText}`);
  }
  console.log('✓ Marathi CHECK_PRICE passed');

  // Test 6: Marathi My Offers
  const mrOffers = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', 'माझे ऑफर्स');
  if (mrOffers.intentRecognized !== 'MY_OFFERS' || mrOffers.languageDetected !== 'mr') {
    throw new Error(`MR Offers failed: ${JSON.stringify(mrOffers)}`);
  }
  if (!mrOffers.replyText.includes('माझे ऑफर्स आणि पेमेंट्स') || !mrOffers.replyText.includes('शेतकरी:')) {
    throw new Error(`MR Offers copy mismatch: ${mrOffers.replyText}`);
  }
  console.log('✓ Marathi MY_OFFERS passed');

  // Test 7: Marathi Sell Crop
  const mrSell = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', 'विक्री कांदा 1000 किलो');
  if (mrSell.intentRecognized !== 'SELL_CROP' || mrSell.languageDetected !== 'mr') {
    throw new Error(`MR Sell failed: ${JSON.stringify(mrSell)}`);
  }
  if (!mrSell.replyText.includes('पीक मसुदा विनंती प्राप्त झाली')) {
    throw new Error(`MR Sell copy mismatch: ${mrSell.replyText}`);
  }
  console.log('✓ Marathi SELL_CROP passed');

  // Test 8: Hindi Sell Crop
  const hiSell = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', 'बेचना सोयाबीन 5000 किलो');
  if (hiSell.intentRecognized !== 'SELL_CROP' || hiSell.languageDetected !== 'hi') {
    throw new Error(`HI Sell failed: ${JSON.stringify(hiSell)}`);
  }
  if (!hiSell.replyText.includes('फसल ड्राफ्ट अनुरोध प्राप्त')) {
    throw new Error(`HI Sell copy mismatch: ${hiSell.replyText}`);
  }
  console.log('✓ Hindi SELL_CROP passed');

  // Test 9: Fallback based on User preferredLang (e.g. phone with preferredLang='mr' sending unknown input)
  const userFallback = await whatsappSmsChannelService.handleIncomingMessage('+919822012345', '12345');
  if (userFallback.languageDetected !== 'mr' || !userFallback.replyText.includes('कृषीसेतू लिंकेज बॉट')) {
    throw new Error(`User fallback failed: ${JSON.stringify(userFallback)}`);
  }
  console.log('✓ User preferredLang fallback passed');

  // Test 10: Fallback for unknown phone with unknown input -> default 'en'
  const guestFallback = await whatsappSmsChannelService.handleIncomingMessage('+910000000000', '12345');
  if (guestFallback.languageDetected !== 'en' || !guestFallback.replyText.includes('KrishiSetu Linkage Bot')) {
    throw new Error(`Guest fallback failed: ${JSON.stringify(guestFallback)}`);
  }
  console.log('✓ Guest default "en" fallback passed');

  console.log('\nALL 10 LOCALIZATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
