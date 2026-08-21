package com.careroute.backend.seed;

import com.careroute.backend.model.Availability;
import com.careroute.backend.model.CarePlanTask;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;
import com.careroute.backend.model.Role;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.User;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.model.VisitTask;
import com.careroute.backend.repository.CaregiverRepository;
import com.careroute.backend.repository.ClientRepository;
import com.careroute.backend.repository.RoleRepository;
import com.careroute.backend.repository.UserRepository;
import com.careroute.backend.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "Password123!";
    private static final int VISIT_MINUTES = 90;
    private static final int SLOT_STRIDE_MINUTES = 150;
    private static final int FIRST_SLOT_OFFSET_MINUTES = 30;
    private static final int UNASSIGNED_VISIT_COUNT = 5;

    private static final List<DayOfWeek> WEEKDAYS = List.of(
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ClientRepository clientRepository;
    private final CaregiverRepository caregiverRepository;
    private final VisitRepository visitRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (clientRepository.count() > 0) {
            log.info("Development data already present, skipping seed");
            return;
        }

        userRepository.save(buildUser("dana.coordinator", "Dana", "Whitcombe", "ROLE_COORDINATOR"));
        userRepository.save(buildUser("priya.admin", "Priya", "Nadarajah", "ROLE_ADMIN"));

        List<Caregiver> caregivers = seedCaregivers();
        List<Client> clients = seedClients();
        int visitCount = seedVisits(caregivers, clients);

        log.info("Seeded {} caregivers, {} clients and {} visits", caregivers.size(), clients.size(), visitCount);
    }

    private User buildUser(String username, String firstName, String lastName, String roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role " + roleName + " is missing; V3__seed_roles.sql did not run"));

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRoles(Set.of(role));
        return user;
    }

    private List<Caregiver> seedCaregivers() {
        List<CaregiverSpec> specs = List.of(
                new CaregiverSpec("marcus.leblanc", "Marcus", "LeBlanc", "905-648-2214",
                        EnumSet.of(Skill.PERSONAL_SUPPORT, Skill.MOBILITY),
                        WEEKDAYS, LocalTime.of(8, 0), LocalTime.of(16, 0)),
                new CaregiverSpec("elena.kovacs", "Elena", "Kovacs", "905-627-8890",
                        EnumSet.of(Skill.NURSING, Skill.MEDICATION),
                        WEEKDAYS, LocalTime.of(9, 0), LocalTime.of(17, 0)),
                new CaregiverSpec("samuel.oduya", "Samuel", "Oduya", "289-426-3317",
                        EnumSet.of(Skill.PERSONAL_SUPPORT, Skill.RESPITE),
                        List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY),
                        LocalTime.of(7, 0), LocalTime.of(15, 0)),
                new CaregiverSpec("nadia.rahimi", "Nadia", "Rahimi", "905-575-1042",
                        EnumSet.of(Skill.NURSING, Skill.MOBILITY, Skill.MEDICATION),
                        List.of(DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY),
                        LocalTime.of(10, 0), LocalTime.of(18, 0)),
                new CaregiverSpec("thomas.beaudry", "Thomas", "Beaudry", "289-887-6503",
                        EnumSet.of(Skill.PERSONAL_SUPPORT, Skill.MEDICATION, Skill.RESPITE),
                        List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY),
                        LocalTime.of(8, 30), LocalTime.of(16, 30)));

        List<Caregiver> caregivers = new ArrayList<>();
        for (CaregiverSpec spec : specs) {
            User user = userRepository.save(buildUser(spec.username(), spec.firstName(), spec.lastName(), "ROLE_CAREGIVER"));

            Caregiver caregiver = Caregiver.builder()
                    .user(user)
                    .phone(spec.phone())
                    .status(CaregiverStatus.ACTIVE)
                    .skills(EnumSet.copyOf(spec.skills()))
                    .build();

            for (DayOfWeek day : spec.days()) {
                caregiver.addAvailability(Availability.builder()
                        .dayOfWeek(day)
                        .startTime(spec.start())
                        .endTime(spec.end())
                        .build());
            }

            caregivers.add(caregiverRepository.save(caregiver));
        }
        return caregivers;
    }

    private List<Client> seedClients() {
        List<ClientSpec> specs = List.of(
                new ClientSpec("Margaret", "Ellison", "905-648-7712", "412 Wilson Street East", "Ancaster", "L9G 2C1",
                        List.of("Assist with morning bathing and dressing", "Prepare breakfast", "Light housekeeping in kitchen")),
                new ClientSpec("Harold", "Pruitt", "905-648-3390", "89 Sulphur Springs Road", "Ancaster", "L9G 3L1",
                        List.of("Administer morning medication", "Check blood pressure and record reading", "Assist with mobility exercises")),
                new ClientSpec("Doreen", "Vasquez", "905-627-1188", "156 King Street West", "Dundas", "L9H 1V4",
                        List.of("Assist with transfer from bed to chair", "Prepare and serve lunch")),
                new ClientSpec("Walter", "Brennan", "905-627-4471", "23 Ogilvie Street", "Dundas", "L9H 2S2",
                        List.of("Change wound dressing", "Administer insulin", "Record fluid intake", "Tidy living area")),
                new ClientSpec("Yvonne", "Chartrand", "905-383-2065", "301 Concession Street", "Hamilton", "L9A 1B2",
                        List.of("Companionship and conversation", "Assist with walk to the mailbox", "Prepare evening meal")),
                new ClientSpec("Stanley", "Okafor", "905-522-9014", "78 Locke Street South", "Hamilton", "L8P 4A7",
                        List.of("Assist with shower and grooming", "Change bed linens")),
                new ClientSpec("Rosemary", "Dunlop", "905-304-6628", "245 Golf Links Road", "Ancaster", "L9K 1H9",
                        List.of("Fill weekly medication organiser", "Assist with stair mobility", "Prepare grocery list")),
                new ClientSpec("Albert", "Mensah", "289-396-5520", "940 Main Street East", "Hamilton", "L8M 1M9",
                        List.of("Respite relief for family caregiver", "Assist with afternoon meal", "Escort to the garden")));

        List<Client> clients = new ArrayList<>();
        for (ClientSpec spec : specs) {
            Client client = Client.builder()
                    .firstName(spec.firstName())
                    .lastName(spec.lastName())
                    .phone(spec.phone())
                    .addressLine(spec.addressLine())
                    .city(spec.city())
                    .postalCode(spec.postalCode())
                    .status(ClientStatus.ACTIVE)
                    .build();

            int order = 0;
            for (String description : spec.tasks()) {
                client.addCarePlanTask(CarePlanTask.builder()
                        .description(description)
                        .sortOrder(order++)
                        .build());
            }

            clients.add(clientRepository.save(client));
        }
        return clients;
    }

    private int seedVisits(List<Caregiver> caregivers, List<Client> clients) {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime now = LocalDateTime.now();

        List<Visit> visits = new ArrayList<>();
        int daySequence = 0;
        int clientCursor = 0;

        for (Caregiver caregiver : caregivers) {
            List<Skill> skills = List.copyOf(caregiver.getSkills());

            for (Availability window : caregiver.getAvailability()) {
                LocalDate date = monday.with(TemporalAdjusters.nextOrSame(window.getDayOfWeek()));
                int slots = daySequence % 3 == 0 ? 1 : 2;

                for (int slot = 0; slot < slots; slot++) {
                    LocalTime start = window.getStartTime()
                            .plusMinutes((long) slot * SLOT_STRIDE_MINUTES + FIRST_SLOT_OFFSET_MINUTES);
                    LocalTime end = start.plusMinutes(VISIT_MINUTES);
                    if (end.isAfter(window.getEndTime())) {
                        continue;
                    }

                    Client client = clients.get(clientCursor++ % clients.size());
                    Visit visit = buildVisit(client, caregiver,
                            LocalDateTime.of(date, start), LocalDateTime.of(date, end),
                            skills.get(daySequence % skills.size()));
                    applyLifecycle(visit, now, visits.size());
                    visits.add(visit);
                }
                daySequence++;
            }
        }

        for (int i = 0; i < UNASSIGNED_VISIT_COUNT; i++) {
            LocalDate date = LocalDate.now().plusDays(1L + i % 3);
            LocalTime start = LocalTime.of(9 + (i % 3) * 3, 0);
            Client client = clients.get(clientCursor++ % clients.size());
            visits.add(buildVisit(client, null,
                    LocalDateTime.of(date, start), LocalDateTime.of(date, start.plusMinutes(VISIT_MINUTES)),
                    Skill.values()[i % Skill.values().length]));
        }

        visitRepository.saveAll(visits);
        return visits.size();
    }

    private Visit buildVisit(Client client, Caregiver caregiver, LocalDateTime start, LocalDateTime end, Skill requiredSkill) {
        Visit visit = Visit.builder()
                .client(client)
                .caregiver(caregiver)
                .scheduledStart(start)
                .scheduledEnd(end)
                .requiredSkill(requiredSkill)
                .status(VisitStatus.SCHEDULED)
                .build();

        int order = 0;
        for (CarePlanTask template : client.getCarePlanTasks()) {
            visit.addTask(VisitTask.builder()
                    .description(template.getDescription())
                    .sortOrder(order++)
                    .completed(false)
                    .build());
        }
        return visit;
    }

    private void applyLifecycle(Visit visit, LocalDateTime now, int index) {
        if (index % 11 == 3) {
            visit.setStatus(VisitStatus.CANCELLED);
            visit.setNotes("Cancelled by the client, rescheduling requested.");
        } else if (visit.getScheduledEnd().isBefore(now)) {
            if (index % 7 == 6) {
                visit.setStatus(VisitStatus.MISSED);
                return;
            }
            visit.setStatus(VisitStatus.COMPLETED);
            visit.setCheckedInAt(toInstant(visit.getScheduledStart().plusMinutes(index % 5L)));
            visit.setCheckedOutAt(toInstant(visit.getScheduledEnd().minusMinutes(index % 4L)));
            visit.setNotes("Visit completed as planned. Client comfortable and in good spirits.");
            visit.getTasks().forEach(VisitTask::markComplete);
        } else if (!visit.getScheduledStart().isAfter(now)) {
            visit.setStatus(VisitStatus.IN_PROGRESS);
            visit.setCheckedInAt(toInstant(visit.getScheduledStart()));
        }
    }

    private Instant toInstant(LocalDateTime value) {
        return value.atZone(ZoneId.systemDefault()).toInstant();
    }

    private record CaregiverSpec(String username, String firstName, String lastName, String phone,
                                 Set<Skill> skills, List<DayOfWeek> days, LocalTime start, LocalTime end) {
    }

    private record ClientSpec(String firstName, String lastName, String phone, String addressLine,
                              String city, String postalCode, List<String> tasks) {
    }
}
