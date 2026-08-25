package com.careroute.backend.service;

import com.careroute.backend.dto.CarePlanTaskRequest;
import com.careroute.backend.dto.CarePlanTaskResponse;
import com.careroute.backend.dto.ClientDetailResponse;
import com.careroute.backend.dto.ClientRequest;
import com.careroute.backend.dto.ClientResponse;
import com.careroute.backend.dto.PageResponse;
import com.careroute.backend.exception.ResourceNotFoundException;
import com.careroute.backend.model.CarePlanTask;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;
import com.careroute.backend.repository.CarePlanTaskRepository;
import com.careroute.backend.repository.ClientRepository;
import com.careroute.backend.spec.ClientSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * FR-2.x. Clients are deactivated rather than deleted: a client row is referenced by every
 * visit ever performed for them, and a care record that can vanish is not a care record.
 */
@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final CarePlanTaskRepository carePlanTaskRepository;

    /** FR-2.2. */
    @Transactional(readOnly = true)
    public PageResponse<ClientResponse> findAll(String search, ClientStatus status, Pageable pageable) {
        return PageResponse.from(
                clientRepository.findAll(ClientSpecifications.withFilters(search, status), pageable),
                ClientResponse::from);
    }

    /** FR-2.3. */
    @Transactional(readOnly = true)
    public ClientDetailResponse findById(UUID id) {
        return ClientDetailResponse.from(loadWithCarePlan(id));
    }

    @Transactional
    public ClientResponse create(ClientRequest request) {
        Client client = Client.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .addressLine(request.addressLine())
                .city(request.city())
                .postalCode(request.postalCode())
                .status(request.status() == null ? ClientStatus.ACTIVE : request.status())
                .build();
        return ClientResponse.from(clientRepository.save(client));
    }

    @Transactional
    public ClientResponse update(UUID id, ClientRequest request) {
        Client client = load(id);
        client.setFirstName(request.firstName());
        client.setLastName(request.lastName());
        client.setPhone(request.phone());
        client.setAddressLine(request.addressLine());
        client.setCity(request.city());
        client.setPostalCode(request.postalCode());
        if (request.status() != null) {
            client.setStatus(request.status());
        }
        return ClientResponse.from(clientRepository.save(client));
    }

    /** FR-2.1 — {@code DELETE} means deactivate. */
    @Transactional
    public void deactivate(UUID id) {
        Client client = load(id);
        client.setStatus(ClientStatus.INACTIVE);
        clientRepository.save(client);
    }

    /** FR-2.4. */
    @Transactional(readOnly = true)
    public List<CarePlanTaskResponse> findCarePlanTasks(UUID clientId) {
        requireExists(clientId);
        return carePlanTaskRepository.findByClientIdOrderBySortOrderAsc(clientId).stream()
                .map(CarePlanTaskResponse::from)
                .toList();
    }

    /**
     * Appends to the care plan. An omitted {@code sortOrder} lands the task at the end, which
     * is what "add a task" means to a coordinator who has not thought about ordering.
     */
    @Transactional
    public CarePlanTaskResponse addCarePlanTask(UUID clientId, CarePlanTaskRequest request) {
        Client client = loadWithCarePlan(clientId);
        int sortOrder = request.sortOrder() != null
                ? request.sortOrder()
                : client.getCarePlanTasks().stream().mapToInt(CarePlanTask::getSortOrder).max().orElse(-1) + 1;

        CarePlanTask task = CarePlanTask.builder()
                .description(request.description())
                .sortOrder(sortOrder)
                .build();
        client.addCarePlanTask(task);
        clientRepository.save(client);
        return CarePlanTaskResponse.from(task);
    }

    @Transactional
    public void removeCarePlanTask(UUID clientId, UUID taskId) {
        Client client = loadWithCarePlan(clientId);
        boolean removed = client.getCarePlanTasks().removeIf(task -> task.getId().equals(taskId));
        if (!removed) {
            throw new ResourceNotFoundException("Care plan task " + taskId + " is not on this client");
        }
        clientRepository.save(client);
    }

    private Client load(UUID id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client", id));
    }

    private Client loadWithCarePlan(UUID id) {
        return clientRepository.findByIdWithCarePlanTasks(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client", id));
    }

    private void requireExists(UUID id) {
        if (!clientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Client", id);
        }
    }
}
