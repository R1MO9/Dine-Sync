import config from "../config/index.js";
import * as mockProvider from "./mock.provider.js";
import * as razorpayProvider from "./razorpay.provider.js";

// See payment.provider.js for the interface every provider implements.
const providers = {
    mock: mockProvider,
    razorpay: razorpayProvider,
};

export default providers[config.payment.provider] || mockProvider;
