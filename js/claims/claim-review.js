const ClaimReview = (() => {
  // Each entry lists its label, the request editor's property, and older record keys.
  const journey = [
    ['Origin', 'orig', 'origin'], ['Destination', 'dest', 'destination'],
    ['Departure Date', 'depDate'], ['Departure Time', 'depTime'],
    ['Arrival Date', 'arrDate'], ['Arrival Time', 'arrTime']
  ];
  const money = [['Amount', 'amt', 'amount'], ['Currency', 'currency'], ['Forex Rate', 'forexRate'], ['Local Amount', 'localAmount']];
  const steps = {
    'Medical Claim': [
      { title: 'Medical', key: 'medicalItems', fields: [
        ['Patient Type', 'patientType'], ['Patient Name', 'patientName'], ['Treatment Type', 'treatmentType'],
        ['Clinic Location', 'clinicLocation'], ['Clinic Category', 'clinicCategory'], ['Clinic / Hospital', 'clinicName'],
        ['Non-panel Clinic', 'nonPanelClinic'], ['Sickness Type', 'sicknessType']
      ] },
      { title: 'Details', key: 'detailItems', fields: [
        ['Receipt No.', 'receiptNo'], ['Expenses', 'expenseType', 'expenses', 'detailExpenses'], ...money
      ] }
    ],
    'OT Claim': [
      { title: 'OT Details', key: 'otEntries', fields: [
        ['Date', 'date', 'otDate'], ['OT Type', 'type', 'otType'], ['Cross Day', 'isCrossDay', 'crossDay'],
        ['Start Time', 'start', 'startTime'], ['End Time', 'end', 'endTime'], ['OT Hours', 'otHours', 'hours'],
        ['Break Hours', 'breakHrs', 'breakHours'], ['Break Minutes', 'breakMins', 'breakMinutes'],
        ['Project', 'project'], ['Reason', 'reason'], ['Meal Allowance Amount', 'mealAmount', 'mealAllowanceAmount'],
        ['Meal Allowance', 'mealAllowance'], ['Transport', 'transport'], ['Distance', 'distance'], ['Way', 'way'],
        ['Mileage Amount', 'mileageAmount'], ['Remarks', 'remarks']
      ] }
    ],
    'Travel Claim': [
      { title: 'Mileage', key: 'mileageItems', fields: [
        ...journey, ['Meter In', 'meterIn'], ['Meter Out', 'meterOut'], ['Distance (km)', 'distanceKm', 'distKm', 'distance'],
        ['Amount', 'amount'], ['Vehicle', 'vehicle'], ['Way', 'way'], ['Project', 'project'], ['Description', 'desc', 'description']
      ] },
      { title: 'Travel', key: 'travelItems', fields: [
        ...journey, ['Transport', 'transport'], ['Way', 'way'], ['No. of Days', 'noOfDays'],
        ['Project', 'project'], ['Task', 'task'], ['Receipt No.', 'receiptNo'], ['Amount', 'amount'], ['Description', 'desc', 'description']
      ] },
      { title: 'Expenses', key: 'expenseItems', fields: [
        ['Expense', 'expense', 'type'], ['Start Date', 'dateFrom'], ['Start Time', 'timeFrom'], ['End Date', 'dateTo'],
        ['End Time', 'timeTo'], ['Project', 'project'], ['Receipt No.', 'receiptNo'], ['Description', 'desc', 'description'],
        ['Company Name', 'companyName', 'company'], ['Business Registration No.', 'businessRN'], ...money
      ] }
    ],
    'Travel Request': [
      { title: 'Task', key: 'taskItems', fields: [
        ['Task', 'taskName', 'task'], ['Purpose', 'purpose'], ['Location', 'location'], ['Start Date', 'startDate'],
        ['Start Time', 'startTime'], ['End Date', 'endDate'], ['End Time', 'endTime']
      ] },
      { title: 'Traveling', key: 'requestTravelItems', fields: [
        ['Transport', 'transport'], ...journey, ['No. of Days', 'noOfDays'], ['Project', 'project'],
        ['Justification', 'justification'], ['Preferred Transport', 'prefTransport'], ['Transport No.', 'transportNo'],
        ['Accommodation', 'hasAcc'], ['Allowance', 'hasAllow'], ['Accommodation Details', 'accDetails'],
        ['Booking Type', 'bookingType'], ['Class', 'class'], ['Estimated Distance', 'estDist'], ['Estimated Cost', 'estCost', 'estimatedCost']
      ] },
      { title: 'Accommodation', key: 'accommodationItems', fields: [
        ['Hotel', 'hotelName', 'hotel'], ['Check In', 'checkInDate', 'checkIn'], ['Check Out', 'checkOutDate', 'checkOut'],
        ['Remarks', 'remarks'], ['Rate', 'rate'], ['Amount', 'amount']
      ] }
    ],
    'Entertainment Claim': [
      { title: 'Detail', key: 'entertainmentDetails', fields: [
        ['Expense', 'type', 'expense'], ['Date', 'date'], ['Project', 'project'], ['Receipt No.', 'ref', 'receiptNo'],
        ['Description', 'desc', 'description'], ['Entertained Person/Org', 'entertainedPerson'], ['Place Entertained', 'placeEntertained'], ...money
      ] },
      { title: 'Employees', key: 'internalAttendees', fields: [
        ['Employee', 'name', 'employee'], ['Position', 'pos', 'position'], ['Department', 'dept', 'department'], ['Company', 'comp', 'company']
      ] },
      { title: 'Guests', key: 'externalAttendees', fields: [
        ['Name', 'name', 'attendee'], ['Company', 'comp', 'company'], ['Designation', 'desig', 'designation'],
        ['Relationship', 'rel', 'relationship'], ['Details', 'detail']
      ] }
    ],
    'Advance Claim': [
      { title: 'Details', key: 'advanceExpenseItems', fields: [
        ['Expense', 'type', 'expense'], ['Description', 'desc', 'description'], ['Project', 'project'], ...money
      ] }
    ],
    'Expense Claim': [
      { title: 'Details', key: 'itemizedDetails', fields: [
        ['Transaction Date', 'txDate'], ['Receipt No.', 'receiptNo'], ['Expense', 'expenseCode', 'expenseType'],
        ['Description', 'desc', 'description'], ...money
      ] }
    ]
  };

  function entries(record, key) {
    if (Array.isArray(record[key])) return record[key];
    // Earlier single-entry requests stored the item on the claim itself.
    if (key === 'medicalItems' && record.patientType != null) return [record];
    if (key === 'detailItems' && record.detailExpenses != null) {
      return [{ receiptNo: record.receiptNo, expenseType: record.detailExpenses, amount: record.detailAmount,
        currency: record.detailCurrency, forexRate: record.detailForexRate, localAmount: record.detailLocalAmount }];
    }
    if (key === 'otEntries' && record.otType != null) return [{ ...record, date: record.otDate ?? record.claimDate }];
    if (key === 'itemizedDetails' && record.receiptNo != null) return [record];
    return [];
  }

  function element(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function field(label, value) {
    const box = element('div', 'field-group');
    box.append(element('span', 'field-label', label), element('div', 'form-ctrl claim-review-value', ClaimApplicationFields.display(value)));
    return box;
  }

  function section(record, step) {
    const panel = element('section', 'form-card');
    panel.append(element('h2', 'form-section-heading', step.title));
    const items = entries(record, step.key);
    if (step.key === 'otEntries' && items.length) {
      const total = items.reduce((sum, item) => sum + (Number(item.otHours ?? item.hours) || 0), 0);
      panel.append(field('Total Hours', total.toFixed(1) + ' hrs'));
    }
    if (!items.length) panel.append(element('p', 'claim-review-empty', 'No entries submitted.'));
    for (const [index, item] of items.entries()) {
      const entry = element('details', 'claim-review-entry');
      entry.open = index === 0;
      const title = step.fields[0].slice(1).map(key => item[key]).find(value => value != null && value !== '');
      entry.append(element('summary', '', title ? String(title) : 'Entry ' + (index + 1)));
      const [from, to] = String(item.dates ?? '').split(/\s+[-–]\s+/);
      const dates = { depDate: from, startDate: from, dateFrom: from, arrDate: to, endDate: to, dateTo: to };
      for (const [label, ...keys] of step.fields) {
        const key = keys.find(key => item[key] != null);
        const box = field(label, item[key] ?? dates[keys[0]]);
        if (label === 'Employee' && item.empNo) {
          box.lastElementChild.append(element('div', 'employee-id-standard', '#' + String(item.empNo).replace(/^#+/, '')));
        }
        entry.append(box);
      }
      if (item.attachments?.length) {
        entry.append(element('span', 'field-label', 'Attachments'), ClaimApplicationFields.files(item.attachments));
      }
      panel.append(entry);
    }
    return panel;
  }

  function create(record) {
    const form = element('div', 'claim-request-review');
    const general = ClaimApplicationFields.review(record);
    for (const [label, key] of [['Required Date', 'requiredDate'], ['Settlement Date', 'settlementDate'], ['Other Reference', 'otherRef'],
      ['Merchant', 'merchant'], ['Tax Invoice', 'taxInvoice'], ['Mileage Rate', 'mileageRate'], ['Tolls / Parking', 'tollsParking']]) {
      if (record[key] != null && record[key] !== '') general.append(field(label, record[key]));
    }
    if (record.optionName === 'Medical Claim' && record.purpose) general.append(field('Purpose', record.purpose));
    if (record.claimPeriodEnd && record.claimPeriodEnd !== record.claimPeriodStart) general.append(field('Claim Period End', record.claimPeriodEnd));
    const groups = steps[record.optionName];
    const panels = [general, ...groups.map(step => section(record, step))];
    if (record.optionName !== 'OT Claim') {
      const nav = element('nav', 'claim-review-steps');
      nav.setAttribute('aria-label', 'Claim steps');
      const titles = ['General', ...groups.map(step => step.title)];
      titles.forEach((title, index) => {
        const button = element('button', 'claim-review-step');
        button.type = 'button';
        button.append(element('span', 'claim-review-number', index + 1), element('span', '', title));
        button.addEventListener('click', () => {
          panels.forEach((panel, i) => { panel.hidden = i !== index; });
          for (const step of nav.children) step.removeAttribute('aria-current');
          button.setAttribute('aria-current', 'step');
        });
        nav.append(button);
        panels[index].hidden = index !== 0;
        if (!index) button.setAttribute('aria-current', 'step');
      });
      form.append(nav);
    }
    form.append(...panels);
    return form;
  }

  return { create };
})();
